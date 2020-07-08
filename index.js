const ArgumentType = require("../../extension-support/argument-type");
const BlockType = require("../../extension-support/block-type");
const formatMessage = require("format-message");
const RateLimiter = require('../../util/rateLimiter.js');
const io = require("socket.io-client");
const cast = require('../../util/cast');
const log = require('../../util/log');


const blockIconURI = require('./icon_logo.png');
const menuIconURI = blockIconURI;

const NODE_ID = "eim/extension_usb_microbit";
const HELP_URL =
    "https://adapter.codelab.club/extension_guide/microbit/";


var ButtonParam = {
    A: "A",
    B: "B",
    A_B: "A+B"
};

var analogPin = {
    one: "1",
    two: "2",
};


var gesture = {
    face_up: "face up",
    face_down: "face down",
    shake: "shake",
};


var AccelerometerParam = {
    X: 'X',
    Y: 'Y',
    Z: 'Z'
};


const MicroBitTiltDirection = {
    FRONT: 'front',
    BACK: 'back',
    LEFT: 'left',
    RIGHT: 'right',
    ANY: 'any'
};

var IconParam = {
    HEART: 'heart',
    HEART_SMALL: 'heart_small',
    HAPPY: 'happy',
    SMILE: 'smile',
    SAD: 'sad',
    CONFUSED: 'confused',
    ANGRY: 'angry',
    ASLEEP: 'asleep',
    SURPRISED: 'surprised',
    SILLY: 'silly',
    FABULOUS: 'fabulous',
    MEH: 'meh',
    YES: 'yes',
    NO: 'no'
};

class AdapterClient {
    constructor(node_id, help_url) {
        const ADAPTER_TOPIC = "adapter/nodes/data";
        const EXTS_OPERATE_TOPIC = "core/exts/operate";
        const NODES_OPERATE_TOPIC = "core/nodes/operate";
        this.SCRATCH_TOPIC = "scratch/extensions/command";
        this.NODE_ID = node_id;
        this.HELP_URL = help_url;
        this.plugin_topic_map = {
            node: NODES_OPERATE_TOPIC,
            extension: EXTS_OPERATE_TOPIC,
        };

        this._requestID = 0;
        this._promiseResolves = {};
        const SendRateMax = 10;
        this._rateLimiter = new RateLimiter(SendRateMax);

        const url = new URL(window.location.href);
        var adapterHost = url.searchParams.get("adapter_host"); // 支持树莓派(分布式使用)
        if (!adapterHost) {
            var adapterHost = window.__static
                ? "127.0.0.1"
                : "codelab-adapter.codelab.club";
        }
        this.socket = io(
            `${window.__static ? "https:" : ""}//${adapterHost}:12358` +
                "/test",
            {
                transports: ["websocket"],
            }
        );

        this.socket.on("sensor", (msg) => {
            this.topic = msg.message.topic;
            this.node_id = msg.message.payload.node_id;
            const message_id = msg.message.payload.message_id;
            if (
                this.topic === ADAPTER_TOPIC &&
                (this.node_id === this.NODE_ID ||
                    this.node_id === "ExtensionManager")
            ) {
                // 只接收当前插件消息
                // ExtensionManager 恢复关于插件的控制信息
                window.message = msg;
                this.adapter_node_content_hat = msg.message.payload.content; 
                this.adapter_node_content_reporter = msg.message.payload.content;
                console.log(
                    `${this.NODE_ID} message->`,
                    msg.message.payload.content
                );

                // todo 放在外部，可插入函数（让AdapterClient变得标准）
                this.button_a = msg.message.payload.content.button_a;
                this.button_b = msg.message.payload.content.button_b;
                this.x = msg.message.payload.content.x;
                this.y = msg.message.payload.content.y;
                this.z = msg.message.payload.content.z;
                this.gesture = msg.message.payload.content.gesture;
                this.pin_one = msg.message.payload.content.pin_one_analog_input;
                this.pin_two = msg.message.payload.content.pin_two_analog_input;

                // 处理对应id的resolve
                if (typeof message_id !== "undefined") {
                    this._promiseResolves[message_id] &&
                        this._promiseResolves[message_id](
                            msg.message.payload.content
                        );
                }
            }
        });
    }

    get_reply_message(messageID) {
        const timeout = 5000; // ms 交给用户选择
        return new Promise((resolve, reject) => {
            this._promiseResolves[messageID] = resolve; // 抛到外部
            setTimeout(() => {
                reject(`timeout(${timeout}ms)`);
            }, timeout);
        });
    }

    emit_with_messageid(node_id, content) {
        // payload is dict
        //messageID: messageID
        /*
    if (typeof payload !== 'object'){
      console.error('payload should be object');
    }*/
        const messageID = this._requestID++;
        const payload = {};
        payload.node_id = node_id;
        payload.content = content;
        payload.message_id = messageID;
        this.socket.emit("actuator", {
            payload: payload,
            topic: this.SCRATCH_TOPIC,
        });
        return this.get_reply_message(messageID);
    }

    emit_without_messageid(node_id, content) {
        const payload = {};
        payload.node_id = node_id;
        payload.content = content;
        this.socket.emit("actuator", {
            payload: payload,
            topic: this.SCRATCH_TOPIC,
        });
    }

    emit_with_messageid_for_control(node_id, content, node_name, pluginType) {
        if (!this._rateLimiter.okayToSend()) return Promise.resolve();

        const messageID = this._requestID++;
        const payload = {};
        payload.node_id = node_id;
        payload.content = content;
        payload.message_id = messageID;
        payload.node_name = node_name;
        this.socket.emit("actuator", {
            payload: payload,
            topic: this.plugin_topic_map[pluginType],
        });
        return this.get_reply_message(messageID);
    }

    whenMessageReceive(content) {
        //rename bool func
        if (
            this.adapter_node_content_hat&&
            content === this.adapter_node_content_hat
        ) {
            setTimeout(() => {
                this.adapter_node_content_hat = null; // 每次清空
            }, 1); //ms // 每次清空
            return true;
        }
    }

}

class Scratch3UsbMicrobitBlocks {

    static get TILT_THRESHOLD() {
        return 15;
    }
    static get STATE_KEY() {
        return "Scratch.usbMicrobit";
    }

    constructor(runtime) {
        this.adapter_client = new AdapterClient(NODE_ID, HELP_URL);
    }

    getInfo() {
        return {
            id: "usbMicrobit",
            name: "usbMicrobit",
            menuIconURI: menuIconURI,
            blockIconURI: blockIconURI,
            blocks: [
                {
                    opcode: "open_help_url",
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: "python.open_help_url",
                        default: "help",
                        description: "open help url",
                    }),
                    arguments: {},
                },
                {
                    opcode: "control_extension",
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: "python.control_extension",
                        default: "[turn] [ext_name]",
                        description:
                            "turn on/off the extension of codelab-adapter",
                    }),
                    arguments: {
                        turn: {
                            type: ArgumentType.STRING,
                            defaultValue: "start",
                            menu: "turn",
                        },
                        ext_name: {
                            type: ArgumentType.STRING,
                            defaultValue: "extension_usb_microbit",
                            menu: "extensions_name",
                        },
                    },
                },
                {
                    opcode: "whenButtonIsPressed",
                    blockType: BlockType.HAT,
                    text: formatMessage({
                        id: "usbMicrobit.whenbuttonispressed",
                        default: "When Button [BUTTON_PARAM] Is Pressed",
                        description: "pass hello by socket"
                    }),
                    arguments: {
                        BUTTON_PARAM: {
                            type: ArgumentType.STRING,
                            menu: "buttonParam",
                            defaultValue: ButtonParam.A
                        }
                    }
                },
                {
                    opcode: "buttonIsPressed",
                    blockType: BlockType.BOOLEAN,
                    // blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: "usbMicrobit.buttonispressed",
                        default: "Button [BUTTON_PARAM] Is Pressed?",
                        description: "pass hello by socket"
                    }),
                    arguments: {
                        BUTTON_PARAM: {
                            type: ArgumentType.STRING,
                            menu: "buttonParam",
                            defaultValue: ButtonParam.A
                        }
                    }
                },
                '---',
                {
                    opcode: "say",
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: "usbMicrobit.say",
                        default: "say [TEXT]",
                        description: "pass hello by socket"
                    }),
                    arguments: {
                        TEXT: {
                            type: ArgumentType.STRING,
                            defaultValue: "Hello!"
                        }
                    }
                },

                {
                    opcode: 'displaySymbol',
                    text: formatMessage({
                        id: 'usbMicrobit.displaySymbol',
                        default: 'display [MATRIX]',
                        description: 'display a pattern on the micro:bit display'
                    }),
                    blockType: BlockType.COMMAND,
                    arguments: {
                        MATRIX: {
                            type: ArgumentType.MATRIX,
                            defaultValue: '0101010101100010101000100'
                        }
                    }
                },
                {
                    opcode: 'showIcon',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'usbMicrobit.showIcon',
                        default: 'showIcon [ICON_PARAM]',
                        description: 'change the icon of microbit'
                    }),
                    arguments: {
                        ICON_PARAM: {
                            type: ArgumentType.STRING,
                            menu: 'iconParam',
                            defaultValue: IconParam.HAPPY
                        }
                    }
                },
                {
                    opcode: "clearScreen",
                    blockType: BlockType.COMMAND,
                    // blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: "usbMicrobit.clearScreen",
                        default: "clear screen",
                        description: "clear screen"
                    }),
                    arguments: {}
                },
                '---',
                {
                    opcode: "get_gesture",
                    // blockType: BlockType.BOOLEAN,
                    blockType: BlockType.BOOLEAN,
                    // blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: "usbMicrobit.get_gesture",
                        default: "gesture is[gesture]?",
                        description: "gesture is?"
                    }),
                    arguments: {
                        gesture: {
                            type: ArgumentType.STRING,
                            menu: "gesture",
                            defaultValue: gesture.face_up
                        }
                    }
                },
                {
                    opcode: 'get_accelerometer',
                    // blockType: BlockType.BOOLEAN,
                    blockType: BlockType.REPORTER,
                    // blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'usbMicrobit.get_accelerometer',
                        default: 'Accelerometer [ACCELEROMETER_PARAM]',
                        description: 'pass hello by socket'
                    }),
                    arguments: {
                        ACCELEROMETER_PARAM: {
                            type: ArgumentType.STRING,
                            menu: 'accelerometerParam',
                            defaultValue: AccelerometerParam.X
                        }
                    }
                },
                {
                    opcode: "getTiltAngle",
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: "usbMicrobit.get_TiltAngle",
                        default: "tilt angle [tiltDirection]",
                        description: "pass hello by socket"
                    }),
                    arguments: {
                        tiltDirection: {
                            type: ArgumentType.STRING,
                            menu: "tiltDirection",
                            defaultValue: MicroBitTiltDirection.FRONT
                        }
                    }
                },
                {
                    opcode: 'isTilted',
                    text: formatMessage({
                        id: 'usbMicrobit.isTilted',
                        default: 'tilted [tiltDirectionAny]?',
                        description: 'is the micro:bit is tilted in a direction?'
                    }),
                    blockType: BlockType.BOOLEAN,
                    arguments: {
                        tiltDirectionAny: {
                            type: ArgumentType.STRING,
                            menu: 'tiltDirectionAny',
                            defaultValue: MicroBitTiltDirection.ANY
                        }
                    }
                },
                '---',
                {
                    opcode: "get_analog_input",
                    // blockType: BlockType.BOOLEAN,
                    blockType: BlockType.REPORTER,
                    // blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: "usbMicrobit.get_analog_input",
                        default: "Analog pin [ANALOG_PIN] value",
                        description: "pass hello by socket"
                    }),
                    arguments: {
                        ANALOG_PIN: {
                            type: ArgumentType.STRING,
                            menu: "analogPin",
                            defaultValue: analogPin.one
                        }
                    }
                },
                '---',
                {
                    opcode: "python_exec",
                    // 前端打上标记 危险
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: "usbMicrobit.python_exec",
                        default: "exec [CODE]",
                        description: "run python code."
                    }),
                    arguments: {
                        CODE: {
                            type: ArgumentType.STRING,
                            defaultValue: 'display.show("c")'
                        }
                    }
                },
            ],
            menus: {
                buttonParam: {
                    acceptReporters: true,
                    items: this.initButtonParam()
                },
                tiltDirection: {
                    acceptReporters: true,
                    items: this.TILT_DIRECTION_MENU
                },
                tiltDirectionAny: {
                    acceptReporters: true,
                    items: this.TILT_DIRECTION_ANY_MENU
                },
                analogPin: {
                    acceptReporters: true,
                    items: this.initAnalogPin()
                },
                gesture: {
                    acceptReporters: true,
                    items: this.initgesture()
                },
                accelerometerParam: {
                    acceptReporters: true,
                    items: this.initAccelerometerParam()
                },
                iconParam: {
                    acceptReporters: true,
                    items: this.initColorParam()
                },
                extensions_name: {
                    acceptReporters: true,
                    items: ["extension_usb_microbit"],
                },
                turn: {
                    acceptReporters: true,
                    items: ["start", "stop"],
                },
            }
        };
    }


    python_exec(args) {
        const python_code = args.CODE;
        this.adapter_client.emit_without_messageid(NODE_ID, python_code);
        return
    }

    initButtonParam() {
        return [{
                text: "A",
                value: ButtonParam.A
            },
            {
                text: "B",
                value: ButtonParam.B
            },
            {
                text: "A+B",
                value: ButtonParam.A_B
            }
        ];
    }

    initColorParam() {
        return [{
            text: formatMessage({
                id: 'usbMicrobit.iconMenu.happy',
                default: 'happy',
                description: 'label for color element in color picker for pen extension'
            }),
            value: IconParam.HAPPY
        }, {
            text: formatMessage({
                id: 'usbMicrobit.iconMenu.smile',
                default: 'smile',
                description: 'label for saturation element in color picker for pen extension'
            }),
            value: IconParam.SMILE
        }, {
            text: formatMessage({
                id: 'usbMicrobit.iconMenu.sad',
                default: 'sad',
                description: 'label for brightness element in color picker for pen extension'
            }),
            value: IconParam.SAD
        }, {
            text: formatMessage({
                id: 'usbMicrobit.iconMenu.heart',
                default: 'heart',
                description: 'label for brightness element in color picker for pen extension'
            }),
            value: IconParam.HEART
        }, {
            text: formatMessage({
                id: 'usbMicrobit.iconMenu.heart_small',
                default: 'heart_small',
                description: 'label for brightness element in color picker for pen extension'
            }),
            value: IconParam.HEART_SMALL
        }, {
            text: formatMessage({
                id: 'usbMicrobit.iconMenu.yes',
                default: 'yes',
                description: 'label for brightness element in color picker for pen extension'
            }),
            value: IconParam.YES
        }, {
            text: formatMessage({
                id: 'usbMicrobit.iconMenu.confused',
                default: 'confused',
                description: 'label for brightness element in color picker for pen extension'
            }),
            value: IconParam.CONFUSED
        }, {
            text: formatMessage({
                id: 'usbMicrobit.iconMenu.angry',
                default: 'angry',
                description: 'label for brightness element in color picker for pen extension'
            }),
            value: IconParam.ANGRY
        }, {
            text: formatMessage({
                id: 'usbMicrobit.iconMenu.asleep',
                default: 'asleep',
                description: 'label for brightness element in color picker for pen extension'
            }),
            value: IconParam.ASLEEP
        }, {
            text: formatMessage({
                id: 'usbMicrobit.iconMenu.surprised',
                default: 'surprised',
                description: 'label for brightness element in color picker for pen extension'
            }),
            value: IconParam.SURPRISED
        }, {
            text: formatMessage({
                id: 'usbMicrobit.iconMenu.silly',
                default: 'silly',
                description: 'label for brightness element in color picker for pen extension'
            }),
            value: IconParam.SILLY
        }, {
            text: formatMessage({
                id: 'usbMicrobit.iconMenu.meh',
                default: 'meh',
                description: 'label for brightness element in color picker for pen extension'
            }),
            value: IconParam.MEH
        }, {
            text: formatMessage({
                id: 'usbMicrobit.iconMenu.fabulous',
                default: 'fabulous',
                description: 'label for brightness element in color picker for pen extension'
            }),
            value: IconParam.FABULOUS
        }, {
            text: formatMessage({
                id: 'usbMicrobit.iconMenu.no',
                default: 'no',
                description: 'label for brightness element in color picker for pen extension'
            }),
            value: IconParam.NO
        }];
    }


    initAccelerometerParam() {
        return [{
                text: "X",
                value: AccelerometerParam.X
            },
            {
                text: "Y",
                value: AccelerometerParam.Y
            },
            {
                text: "Z",
                value: AccelerometerParam.Z
            }
        ];
    }

    initAnalogPin() {
        return [{
                text: "1",
                value: analogPin.one
            },
            {
                text: "2",
                value: analogPin.two
            }
        ];
    }

    initgesture() {
        return [{
                text: formatMessage({
                    id: 'usbMicrobit.gesture.face_up',
                    default: 'face up',
                    description: 'label for front element in tilt direction picker for micro:bit extension'
                }),
                value: gesture.face_up
            },
            {
                text: formatMessage({
                    id: 'usbMicrobit.gesture.face_down',
                    default: 'face down',
                    description: 'label for front element in tilt direction picker for micro:bit extension'
                }),
                value: gesture.face_down
            },
            {
                text: formatMessage({
                    id: 'usbMicrobit.gesture.shake',
                    default: 'shake',
                    description: 'label for front element in tilt direction picker for micro:bit extension'
                }),
                value: gesture.shake
            },
        ];
    }


    get TILT_DIRECTION_MENU() {

        return [{
                text: formatMessage({
                    id: 'microbit.tiltDirectionMenu.front',
                    default: 'front',
                    description: 'label for front element in tilt direction picker for micro:bit extension'
                }),
                value: MicroBitTiltDirection.FRONT
            },
            {
                text: formatMessage({
                    id: 'microbit.tiltDirectionMenu.back',
                    default: 'back',
                    description: 'label for back element in tilt direction picker for micro:bit extension'
                }),
                value: MicroBitTiltDirection.BACK
            },
            {
                text: formatMessage({
                    id: 'microbit.tiltDirectionMenu.left',
                    default: 'left',
                    description: 'label for left element in tilt direction picker for micro:bit extension'
                }),
                value: MicroBitTiltDirection.LEFT
            },
            {
                text: formatMessage({
                    id: 'microbit.tiltDirectionMenu.right',
                    default: 'right',
                    description: 'label for right element in tilt direction picker for micro:bit extension'
                }),
                value: MicroBitTiltDirection.RIGHT
            }
        ];
    }


    get TILT_DIRECTION_ANY_MENU() {
        return [
            ...this.TILT_DIRECTION_MENU,
            {
                text: formatMessage({
                    id: 'microbit.tiltDirectionMenu.any',
                    default: 'any',
                    description: 'label for any direction element in tilt direction picker for micro:bit extension'
                }),
                value: MicroBitTiltDirection.ANY
            }
        ];
    }

    showIcon(args) {
        // todo 不够平坦
        var convert = {
            happy: 'Image.HAPPY',
            smile: 'Image.SMILE',
            sad: 'Image.SAD',
            heart: 'Image.HEART',
            heart_small: 'Image.HEART_SMALL',
            yes: 'Image.YES',
            no: 'Image.NO',
            confused: 'Image.CONFUSED',
            angry: 'Image.ANGRY',
            asleep: 'Image.ASLEEP',
            surprised: 'Image.SURPRISED',
            silly: 'Image.SILLY',
            meh: 'Image.MEH',
            fabulous: 'Image.FABULOUS'
        };
        var python_code = "display.show(".concat(convert[args.ICON_PARAM], ", wait = True, loop = False)"); // console.log(args.ICON_PARAM);

        return this.adapter_client.emit_without_messageid(NODE_ID, python_code);
    }
    getHats() {
        return {
            microbit_whenbuttonaispressed: {
                restartExistingThreads: false,
                edgeActivated: true
            }
        };
    }

    getMonitored() {
        return {
            microbit_buttonispressed: {}
        };
    }

    whenButtonIsPressed(args) {
        if (args.BUTTON_PARAM === "A") {
            return this.adapter_client.button_a;
        } else if (args.BUTTON_PARAM === "B") {
            return this.adapter_client.button_b;
        } else if (args.BUTTON_PARAM === "A+B") {
            return this.adapter_client.button_a && this.adapter_client.button_b;
        }
    }

    get_analog_input(args) {
        if (args.ANALOG_PIN === "1") {
            return this.adapter_client.pin_one;
        } else if (args.ANALOG_PIN === "2") {
            return this.adapter_client.pin_two;
        }
    }

    get_accelerometer(args) {
        if (args.ACCELEROMETER_PARAM === 'X') {
            return this.adapter_client.x;
        } else if (args.ACCELEROMETER_PARAM === 'Y') {
            return this.adapter_client.y;
        } else if (args.ACCELEROMETER_PARAM === 'Z') {
            return this.adapter_client.z;
        }
    }
    buttonIsPressed(args) {
        if (args.BUTTON_PARAM === "A") {
            return this.adapter_client.button_a;
        } else if (args.BUTTON_PARAM === "B") {
            return this.adapter_client.button_b;
        } else if (args.BUTTON_PARAM === "A+B") {
            return this.adapter_client.button_a && this.adapter_client.button_b;
        }
    }
    say(args) {
        var python_code = 'display.scroll("'.concat(
            args.TEXT,
            '", wait=False, loop=False)'
        );
        return this.adapter_client.emit_without_messageid(NODE_ID, python_code);
    }

    displaySymbol(args) {
        const symbol = cast.toString(args.MATRIX).replace(/\s/g, '');
        var symbol_code = "";
        for (var i = 0; i < symbol.length; i++) {
            if (i % 5 == 0 && i != 0) {
                symbol_code = symbol_code + ":"
            }
            if (symbol[i] != "0") {
                symbol_code = symbol_code + "7";
            } else {
                symbol_code = symbol_code + "0";
            }
        }

        var python_code = 'display.show(Image("'.concat(
            symbol_code,
            '"), wait=True, loop=False)'
        );


        return this.adapter_client.emit_without_messageid(NODE_ID, python_code);
    }
    clearScreen(args) {
        var python_code = "display.clear()";
        return this.adapter_client.emit_without_messageid(NODE_ID, python_code);
    }

    isTilted(args) {
        return this._isTilted(args.tiltDirectionAny);
    }

    /**
     * @param {object} args - the block's arguments.
     * @property {TiltDirection} DIRECTION - the direction (front, back, left, right) to check.
     * @return {number} - the tilt sensor's angle in the specified direction.
     * Note that getTiltAngle(front) = -getTiltAngle(back) and getTiltAngle(left) = -getTiltAngle(right).
     */
    getTiltAngle(args) {
        return this._getTiltAngle(args.tiltDirection);
    }

    _getTiltAngle(args) {
        switch (args) {
            case MicroBitTiltDirection.FRONT:
                return Math.round(this.adapter_client.y / -10);
            case MicroBitTiltDirection.BACK:
                return Math.round(this.adapter_client.y / 10);
            case MicroBitTiltDirection.LEFT:
                return Math.round(this.adapter_client.x / -10);
            case MicroBitTiltDirection.RIGHT:
                return Math.round(this.adapter_client.x / 10);
            default:
                log.warn(`Unknown tilt direction in _getTiltAngle: ${args}`);
        }
    }

    _isTilted(args) {
        switch (args) {
            case MicroBitTiltDirection.ANY:
                return (Math.abs(this.adapter_client.x / 10) >= Scratch3UsbMicrobitBlocks.TILT_THRESHOLD) ||
                    (Math.abs(this.adapter_client.y / 10) >= Scratch3UsbMicrobitBlocks.TILT_THRESHOLD);
            default:
                console.log(args);
                return this._getTiltAngle(args) >= Scratch3UsbMicrobitBlocks.TILT_THRESHOLD;
        }
    }

    get_gesture(args) {

        switch (args.gesture) {
            case this.adapter_client.gesture:
                return true;
            default:
                return false;
        }
    }

    control_extension(args) {
        const content = args.turn;
        const ext_name = args.ext_name;
        return this.adapter_client.emit_with_messageid_for_control(
            this.adapter_client.NODE_ID,
            content,
            ext_name,
            "extension"
        );
    }

    open_help_url(args) {
        window.open(HELP_URL);
    }

}

module.exports = Scratch3UsbMicrobitBlocks;
