const ArgumentType = require("../../extension-support/argument-type");
const BlockType = require("../../extension-support/block-type");
const formatMessage = require("format-message");
const cast = require("../../util/cast");
const log = require("../../util/log");
const AdapterBaseClient = require("../scratch3_eim/codelab_adapter_base.js");

/*
https://github.com/LLK/scratch-vm/blob/develop/src/extensions/scratch3_microbit/index.js#L84
放弃Scratch愚蠢丑陋的UI连接
*/

const blockIconURI = require("./icon_logo.png");
const menuIconURI = blockIconURI;

const NODE_ID = "eim/extension_usb_microbit";
const HELP_URL = "https://adapter.codelab.club/extension_guide/microbit/";

const FormHelp = {
    en: "help",
    "zh-cn": "帮助",
};

const Form_update_ports = {
    en: "update ports",
    "zh-cn": "更新串口信息",
};
const Form_connect = {
    en: "connect port [port]",
    "zh-cn": "连接到 [port]",
};

const FormFlash = {
    en: "flash firmware",
    "zh-cn": "刷入固件",
};

var ButtonParam = {
    A: "A",
    B: "B",
    A_B: "A+B",
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
    X: "X",
    Y: "Y",
    Z: "Z",
};

const MicroBitTiltDirection = {
    FRONT: "front",
    BACK: "back",
    LEFT: "left",
    RIGHT: "right",
    ANY: "any",
};

var IconParam = {
    HEART: "heart",
    HEART_SMALL: "heart_small",
    HAPPY: "happy",
    SMILE: "smile",
    SAD: "sad",
    CONFUSED: "confused",
    ANGRY: "angry",
    ASLEEP: "asleep",
    SURPRISED: "surprised",
    SILLY: "silly",
    FABULOUS: "fabulous",
    MEH: "meh",
    YES: "yes",
    NO: "no",
};

class Client {
    onAdapterPluginMessage(msg) {
        this.node_id = msg.message.payload.node_id;
        if (
            this.node_id === this.NODE_ID ||
            this.node_id === "ExtensionManager"
        ) {
            this.adapter_node_content_hat = msg.message.payload.content;
            this.adapter_node_content_reporter = msg.message.payload.content;
            console.log(
                `${this.NODE_ID} message->`,
                msg.message.payload.content
            );
            if(this.adapter_node_content_reporter && this.adapter_node_content_reporter.ports){
                this.ports = this.adapter_node_content_reporter.ports;
            }

            this.button_a = msg.message.payload.content.button_a;
            this.button_b = msg.message.payload.content.button_b;
            this.x = msg.message.payload.content.x;
            this.y = msg.message.payload.content.y;
            this.z = msg.message.payload.content.z;
            this.gesture = msg.message.payload.content.gesture;
            this.pin_one = msg.message.payload.content.pin_one_analog_input;
            this.pin_two = msg.message.payload.content.pin_two_analog_input;
        }
    }

    constructor(node_id, help_url, runtime) {
        this.NODE_ID = node_id;
        this.HELP_URL = help_url;
        this._runtime = runtime;

        this.adapter_base_client = new AdapterBaseClient(
            null, // onConnect,
            null, // onDisconnect,
            null, // onMessage,
            this.onAdapterPluginMessage.bind(this), // onAdapterPluginMessage,
            null, // update_nodes_status,
            null, // node_statu_change_callback,
            null, // notify_callback,
            null, // error_message_callback,
            null, // update_adapter_status
            60,
            runtime
        );
    }

    formatPorts() {
        // text value list
        console.log("ports -> ", this.ports);
        if (Array.isArray(this.ports) && this.ports.length) {
            // list
            // window.extensions_statu = this.exts_statu;
            let ports = this.ports.map((x) => ({ text: x, value: x }));
            return ports;
        }
        return [
            {
                text: "",
                value: "",
            },
        ];
    }
}

class UsbMicroBit {
    // https://github.com/LLK/scratch-vm/blob/develop/src/extensions/scratch3_microbit/index.js#L62
    constructor(runtime, extensionId) {
        this._adapter_client = new Client(NODE_ID, HELP_URL, runtime); // 把收到的信息传递到runtime里
        this._runtime = runtime;
        /*
        this._runtime = runtime;
        this._runtime.registerPeripheralExtension(extensionId, this); // 主要使用UI runtime
        this._extensionId = extensionId;
        this.reset = this.reset.bind(this);
        this._onConnect = this._onConnect.bind(this);
        this._onMessage = this._onMessage.bind(this);
        this._timeoutID = null;
        this._busy = false;
        */
    }

    // https://github.com/LLK/scratch-vm/blob/5f101256434b21035e55183d4e0e4c2d1e5936fa/src/io/ble.js#L171
    /**
     * Called by the runtime when user wants to scan for a peripheral.
     */

    start_extension(){
        // todo: disconnect
        const content = 'start';
        const ext_name = 'extension_usb_microbit';
        return this._adapter_client.adapter_base_client.emit_with_messageid_for_control(
            NODE_ID,
            content,
            ext_name,
            "extension"
        ).then(() => {
            console.log("start extension_usb_microbit")
            //todo update_ports
        })
    }

    scan() {
        if (window.socketState !== undefined && !window.socketState) {
            this._runtime.emit(this._runtime.constructor.PERIPHERAL_REQUEST_ERROR, {
                message: `Codelab adapter 未连接`,
                extensionId: this.extensionId
            });
            return
        }
        let promise = Promise.resolve()

        //  自动打开插件
        promise = promise.then(() => {
            return this.start_extension()
        })


        const code = `microbitHelper.update_ports()`; // 广播 , 收到特定信息更新变量
        promise.then(() => {
            return this._adapter_client.adapter_base_client.emit_with_messageid(
                NODE_ID,
                code
            )
        }).then(() => {
            let ports = this._adapter_client.formatPorts()
            let portsObj = ports
                .filter(port => !!port.value)
                .map(port => ({"name":port.value,"peripheralId": port.value,"rssi":-0}))
                .reduce((prev, curr) => {
                    prev[curr.peripheralId] = curr
                    return prev
                }, {})
            this._runtime.emit(
                this._runtime.constructor.PERIPHERAL_LIST_UPDATE,
                portsObj
            );
        }).catch(e => console.error(e))
        // todo 打开插件
        // 发送请求，要求后端返回 device list
        /*
        scan
        from scratch {"jsonrpc":"2.0","method":"discover","params":{"filters":[{"services":["10b20100-5b3b-4571-9508-cf3efcd7bbae"]}]},"id":0}
        from adapter {"method":"didDiscoverPeripheral","params":{"name":"toio Core Cube","peripheralId":"385C2678-9C23-482A-A40F-627D77EB3CFD","rssi":-70},"jsonrpc":"2.0"}

        connect
            {"jsonrpc":"2.0","method":"connect","params":{"peripheralId":"385C2678-9C23-482A-A40F-627D77EB3CFD"},"id":1}
            rep {"id":1,"result":null,"jsonrpc":"2.0"}
            */
        console.log("scan");
        /*
        this._availablePeripherals = {};
        this._availablePeripherals[params.peripheralId] = params;
        this._runtime.emit(
                this._runtime.constructor.PERIPHERAL_LIST_UPDATE,
                this._availablePeripherals
            );
        */
    }

    _onConnect() {
        console.log(`_onConnect`);
    }

    _onMessage(msg) {
        console.log("_onMessage");
    }

    /**
     * Called by the runtime when user wants to connect to a certain peripheral.
     * @param {number} id - the id of the peripheral to connect to.
     */

    connect(id) {
        // UI 触发
        console.log("connect");
        if (this._adapter_client) {
            const port = id;
            const code = `microbitHelper.connect("${port}")`; // disconnect()

            this._adapter_client.adapter_base_client.emit_with_messageid(
                NODE_ID,
                code
            ).then(() => {
                this.connected = true
                this._runtime.emit(this._runtime.constructor.PERIPHERAL_CONNECTED);
            })
        }
    }

    disconnect() {
        // todo: disconnect: `microbitHelper.disconnect()`;
        this.reset();

        if (!this._adapter_client.adapter_base_client.connected) {
            return
        }

        const code = `microbitHelper.disconnect()`; // disconnect()
        this._adapter_client.adapter_base_client.emit_with_messageid(
            NODE_ID,
            code
        ).then((res) => {
            // 这个消息没有 resolve
           console.log(res)
        }).catch(e => console.error(e))
    }

    reset() {
        console.log("reset");
        this.connected = false
        this._runtime.emit(this._runtime.constructor.PERIPHERAL_DISCONNECTED);
        // 断开
    }

    isConnected() {
        let connected = false;
        if (this._adapter_client) {
            connected = this._adapter_client.adapter_base_client.connected && this.connected;
        }
        return connected;
    }
}

class Scratch3UsbMicrobitBlocks {
    static get TILT_THRESHOLD() {
        return 15;
    }
    static get STATE_KEY() {
        return "Scratch.usbMicrobit";
    }

    static get EXTENSION_ID() {
        return "usbMicrobit";
    }

    constructor(runtime) {
        // Create a new MicroBit peripheral instance
        this._runtime = runtime
        this._peripheral = new UsbMicroBit(
            runtime,
            Scratch3UsbMicrobitBlocks.EXTENSION_ID
        );
        this._runtime.registerPeripheralExtension(Scratch3UsbMicrobitBlocks.EXTENSION_ID, this._peripheral); // 主要使用UI runtime
    }

    _setLocale() {
        let now_locale = "";
        switch (formatMessage.setup().locale) {
            case "en":
                now_locale = "en";
                break;
            case "zh-cn":
                now_locale = "zh-cn";
                break;
            default:
                now_locale = "zh-cn";
                break;
        }
        return now_locale;
    }

    getInfo() {
        let the_locale = this._setLocale();
        return {
            id: "usbMicrobit",
            name: "usbMicrobit",
            menuIconURI: menuIconURI,
            blockIconURI: blockIconURI,
            color1: "#3eb6fd",
            showStatusButton: true,
            blocks: [
                {
                    opcode: "open_help_url",
                    blockType: BlockType.COMMAND,
                    text: FormHelp[the_locale],
                    arguments: {},
                },
                {
                    opcode: "flash_firmware",
                    blockType: BlockType.COMMAND,
                    text: FormFlash[the_locale],
                    arguments: {},
                },
                /*
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
                    opcode: "update_ports",
                    blockType: BlockType.COMMAND,
                    text: Form_update_ports[the_locale],
                    arguments: {},
                },
                {
                    opcode: "connect",
                    blockType: BlockType.COMMAND,
                    text: Form_connect[the_locale],
                    arguments: {
                        port: {
                            type: ArgumentType.STRING,
                            defaultValue: "",
                            menu: "ports",
                        },
                    },
                },
                */
                {
                    opcode: "whenButtonIsPressed",
                    blockType: BlockType.HAT,
                    text: formatMessage({
                        id: "usbMicrobit.whenbuttonispressed",
                        default: "When Button [BUTTON_PARAM] Is Pressed",
                        description: "pass hello by socket",
                    }),
                    arguments: {
                        BUTTON_PARAM: {
                            type: ArgumentType.STRING,
                            menu: "buttonParam",
                            defaultValue: ButtonParam.A,
                        },
                    },
                },
                {
                    opcode: "buttonIsPressed",
                    blockType: BlockType.BOOLEAN,
                    // blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: "usbMicrobit.buttonispressed",
                        default: "Button [BUTTON_PARAM] Is Pressed?",
                        description: "pass hello by socket",
                    }),
                    arguments: {
                        BUTTON_PARAM: {
                            type: ArgumentType.STRING,
                            menu: "buttonParam",
                            defaultValue: ButtonParam.A,
                        },
                    },
                },
                "---",
                {
                    opcode: "say",
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: "usbMicrobit.say",
                        default: "say [TEXT]",
                        description: "pass hello by socket",
                    }),
                    arguments: {
                        TEXT: {
                            type: ArgumentType.STRING,
                            defaultValue: "Hello!",
                        },
                    },
                },

                {
                    opcode: "displaySymbol",
                    text: formatMessage({
                        id: "usbMicrobit.displaySymbol",
                        default: "display [MATRIX]",
                        description:
                            "display a pattern on the micro:bit display",
                    }),
                    blockType: BlockType.COMMAND,
                    arguments: {
                        MATRIX: {
                            type: ArgumentType.MATRIX,
                            defaultValue: "0101010101100010101000100",
                        },
                    },
                },
                {
                    opcode: "showIcon",
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: "usbMicrobit.showIcon",
                        default: "showIcon [ICON_PARAM]",
                        description: "change the icon of microbit",
                    }),
                    arguments: {
                        ICON_PARAM: {
                            type: ArgumentType.STRING,
                            menu: "iconParam",
                            defaultValue: IconParam.HAPPY,
                        },
                    },
                },
                {
                    opcode: "clearScreen",
                    blockType: BlockType.COMMAND,
                    // blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: "usbMicrobit.clearScreen",
                        default: "clear screen",
                        description: "clear screen",
                    }),
                    arguments: {},
                },
                "---",
                {
                    opcode: "get_gesture",
                    // blockType: BlockType.BOOLEAN,
                    blockType: BlockType.BOOLEAN,
                    // blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: "usbMicrobit.get_gesture",
                        default: "gesture is[gesture]?",
                        description: "gesture is?",
                    }),
                    arguments: {
                        gesture: {
                            type: ArgumentType.STRING,
                            menu: "gesture",
                            defaultValue: gesture.face_up,
                        },
                    },
                },
                {
                    opcode: "get_accelerometer",
                    // blockType: BlockType.BOOLEAN,
                    blockType: BlockType.REPORTER,
                    // blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: "usbMicrobit.get_accelerometer",
                        default: "Accelerometer [ACCELEROMETER_PARAM]",
                        description: "pass hello by socket",
                    }),
                    arguments: {
                        ACCELEROMETER_PARAM: {
                            type: ArgumentType.STRING,
                            menu: "accelerometerParam",
                            defaultValue: AccelerometerParam.X,
                        },
                    },
                },
                {
                    opcode: "getTiltAngle",
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: "usbMicrobit.get_TiltAngle",
                        default: "tilt angle [tiltDirection]",
                        description: "pass hello by socket",
                    }),
                    arguments: {
                        tiltDirection: {
                            type: ArgumentType.STRING,
                            menu: "tiltDirection",
                            defaultValue: MicroBitTiltDirection.FRONT,
                        },
                    },
                },
                {
                    opcode: "isTilted",
                    text: formatMessage({
                        id: "usbMicrobit.isTilted",
                        default: "tilted [tiltDirectionAny]?",
                        description:
                            "is the micro:bit is tilted in a direction?",
                    }),
                    blockType: BlockType.BOOLEAN,
                    arguments: {
                        tiltDirectionAny: {
                            type: ArgumentType.STRING,
                            menu: "tiltDirectionAny",
                            defaultValue: MicroBitTiltDirection.ANY,
                        },
                    },
                },
                "---",
                {
                    opcode: "get_analog_input",
                    // blockType: BlockType.BOOLEAN,
                    blockType: BlockType.REPORTER,
                    // blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: "usbMicrobit.get_analog_input",
                        default: "Analog pin [ANALOG_PIN] value",
                        description: "pass hello by socket",
                    }),
                    arguments: {
                        ANALOG_PIN: {
                            type: ArgumentType.STRING,
                            menu: "analogPin",
                            defaultValue: analogPin.one,
                        },
                    },
                },
                "---",
                {
                    opcode: "python_exec",
                    // 前端打上标记 危险
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: "usbMicrobit.python_exec",
                        default: "exec [CODE]",
                        description: "run python code.",
                    }),
                    arguments: {
                        CODE: {
                            type: ArgumentType.STRING,
                            defaultValue: 'display.show("c")',
                        },
                    },
                },
            ],
            menus: {
                buttonParam: {
                    acceptReporters: true,
                    items: this.initButtonParam(),
                },
                tiltDirection: {
                    acceptReporters: true,
                    items: this.TILT_DIRECTION_MENU,
                },
                tiltDirectionAny: {
                    acceptReporters: true,
                    items: this.TILT_DIRECTION_ANY_MENU,
                },
                analogPin: {
                    acceptReporters: true,
                    items: this.initAnalogPin(),
                },
                gesture: {
                    acceptReporters: true,
                    items: this.initgesture(),
                },
                accelerometerParam: {
                    acceptReporters: true,
                    items: this.initAccelerometerParam(),
                },
                iconParam: {
                    acceptReporters: true,
                    items: this.initColorParam(),
                },
                extensions_name: {
                    acceptReporters: true,
                    items: ["extension_usb_microbit"],
                },
                turn: {
                    acceptReporters: true,
                    items: ["start", "stop"],
                },
                ports: {
                    acceptReporters: true,
                    items: "_formatPorts",
                },
            },
        };
    }

    _formatPorts() {
        return this._peripheral._adapter_client.formatPorts();
    }

    python_exec(args) {
        const python_code = `${args.CODE}`;
        this._peripheral._adapter_client.adapter_base_client.emit_with_messageid(
            NODE_ID,
            python_code
        );
        return;
    }

    initButtonParam() {
        return [
            {
                text: "A",
                value: ButtonParam.A,
            },
            {
                text: "B",
                value: ButtonParam.B,
            },
            {
                text: "A+B",
                value: ButtonParam.A_B,
            },
        ];
    }

    initColorParam() {
        return [
            {
                text: formatMessage({
                    id: "usbMicrobit.iconMenu.happy",
                    default: "happy",
                    description:
                        "label for color element in color picker for pen extension",
                }),
                value: IconParam.HAPPY,
            },
            {
                text: formatMessage({
                    id: "usbMicrobit.iconMenu.smile",
                    default: "smile",
                    description:
                        "label for saturation element in color picker for pen extension",
                }),
                value: IconParam.SMILE,
            },
            {
                text: formatMessage({
                    id: "usbMicrobit.iconMenu.sad",
                    default: "sad",
                    description:
                        "label for brightness element in color picker for pen extension",
                }),
                value: IconParam.SAD,
            },
            {
                text: formatMessage({
                    id: "usbMicrobit.iconMenu.heart",
                    default: "heart",
                    description:
                        "label for brightness element in color picker for pen extension",
                }),
                value: IconParam.HEART,
            },
            {
                text: formatMessage({
                    id: "usbMicrobit.iconMenu.heart_small",
                    default: "heart_small",
                    description:
                        "label for brightness element in color picker for pen extension",
                }),
                value: IconParam.HEART_SMALL,
            },
            {
                text: formatMessage({
                    id: "usbMicrobit.iconMenu.yes",
                    default: "yes",
                    description:
                        "label for brightness element in color picker for pen extension",
                }),
                value: IconParam.YES,
            },
            {
                text: formatMessage({
                    id: "usbMicrobit.iconMenu.confused",
                    default: "confused",
                    description:
                        "label for brightness element in color picker for pen extension",
                }),
                value: IconParam.CONFUSED,
            },
            {
                text: formatMessage({
                    id: "usbMicrobit.iconMenu.angry",
                    default: "angry",
                    description:
                        "label for brightness element in color picker for pen extension",
                }),
                value: IconParam.ANGRY,
            },
            {
                text: formatMessage({
                    id: "usbMicrobit.iconMenu.asleep",
                    default: "asleep",
                    description:
                        "label for brightness element in color picker for pen extension",
                }),
                value: IconParam.ASLEEP,
            },
            {
                text: formatMessage({
                    id: "usbMicrobit.iconMenu.surprised",
                    default: "surprised",
                    description:
                        "label for brightness element in color picker for pen extension",
                }),
                value: IconParam.SURPRISED,
            },
            {
                text: formatMessage({
                    id: "usbMicrobit.iconMenu.silly",
                    default: "silly",
                    description:
                        "label for brightness element in color picker for pen extension",
                }),
                value: IconParam.SILLY,
            },
            {
                text: formatMessage({
                    id: "usbMicrobit.iconMenu.meh",
                    default: "meh",
                    description:
                        "label for brightness element in color picker for pen extension",
                }),
                value: IconParam.MEH,
            },
            {
                text: formatMessage({
                    id: "usbMicrobit.iconMenu.fabulous",
                    default: "fabulous",
                    description:
                        "label for brightness element in color picker for pen extension",
                }),
                value: IconParam.FABULOUS,
            },
            {
                text: formatMessage({
                    id: "usbMicrobit.iconMenu.no",
                    default: "no",
                    description:
                        "label for brightness element in color picker for pen extension",
                }),
                value: IconParam.NO,
            },
        ];
    }

    initAccelerometerParam() {
        return [
            {
                text: "X",
                value: AccelerometerParam.X,
            },
            {
                text: "Y",
                value: AccelerometerParam.Y,
            },
            {
                text: "Z",
                value: AccelerometerParam.Z,
            },
        ];
    }

    initAnalogPin() {
        return [
            {
                text: "1",
                value: analogPin.one,
            },
            {
                text: "2",
                value: analogPin.two,
            },
        ];
    }

    initgesture() {
        return [
            {
                text: formatMessage({
                    id: "usbMicrobit.gesture.face_up",
                    default: "face up",
                    description:
                        "label for front element in tilt direction picker for micro:bit extension",
                }),
                value: gesture.face_up,
            },
            {
                text: formatMessage({
                    id: "usbMicrobit.gesture.face_down",
                    default: "face down",
                    description:
                        "label for front element in tilt direction picker for micro:bit extension",
                }),
                value: gesture.face_down,
            },
            {
                text: formatMessage({
                    id: "usbMicrobit.gesture.shake",
                    default: "shake",
                    description:
                        "label for front element in tilt direction picker for micro:bit extension",
                }),
                value: gesture.shake,
            },
        ];
    }

    get TILT_DIRECTION_MENU() {
        return [
            {
                text: formatMessage({
                    id: "microbit.tiltDirectionMenu.front",
                    default: "front",
                    description:
                        "label for front element in tilt direction picker for micro:bit extension",
                }),
                value: MicroBitTiltDirection.FRONT,
            },
            {
                text: formatMessage({
                    id: "microbit.tiltDirectionMenu.back",
                    default: "back",
                    description:
                        "label for back element in tilt direction picker for micro:bit extension",
                }),
                value: MicroBitTiltDirection.BACK,
            },
            {
                text: formatMessage({
                    id: "microbit.tiltDirectionMenu.left",
                    default: "left",
                    description:
                        "label for left element in tilt direction picker for micro:bit extension",
                }),
                value: MicroBitTiltDirection.LEFT,
            },
            {
                text: formatMessage({
                    id: "microbit.tiltDirectionMenu.right",
                    default: "right",
                    description:
                        "label for right element in tilt direction picker for micro:bit extension",
                }),
                value: MicroBitTiltDirection.RIGHT,
            },
        ];
    }

    get TILT_DIRECTION_ANY_MENU() {
        return [
            ...this.TILT_DIRECTION_MENU,
            {
                text: formatMessage({
                    id: "microbit.tiltDirectionMenu.any",
                    default: "any",
                    description:
                        "label for any direction element in tilt direction picker for micro:bit extension",
                }),
                value: MicroBitTiltDirection.ANY,
            },
        ];
    }

    showIcon(args) {
        // todo 不够平坦
        var convert = {
            happy: "Image.HAPPY",
            smile: "Image.SMILE",
            sad: "Image.SAD",
            heart: "Image.HEART",
            heart_small: "Image.HEART_SMALL",
            yes: "Image.YES",
            no: "Image.NO",
            confused: "Image.CONFUSED",
            angry: "Image.ANGRY",
            asleep: "Image.ASLEEP",
            surprised: "Image.SURPRISED",
            silly: "Image.SILLY",
            meh: "Image.MEH",
            fabulous: "Image.FABULOUS",
        };
        //microbitHelper.send_command('''${args.CODE}''')
        var python_code = `display.show(${
            convert[args.ICON_PARAM]
        }, wait = True, loop = False)`; // console.log(args.ICON_PARAM);

        return this._peripheral._adapter_client.adapter_base_client.emit_with_messageid(
            NODE_ID,
            python_code
        );
    }
    getHats() {
        return {
            microbit_whenbuttonaispressed: {
                restartExistingThreads: false,
                edgeActivated: true,
            },
        };
    }

    getMonitored() {
        return {
            microbit_buttonispressed: {},
        };
    }

    whenButtonIsPressed(args) {
        if (args.BUTTON_PARAM === "A") {
            return this._peripheral._adapter_client.button_a;
        } else if (args.BUTTON_PARAM === "B") {
            return this._peripheral._adapter_client.button_b;
        } else if (args.BUTTON_PARAM === "A+B") {
            return (
                this._peripheral._adapter_client.button_a &&
                this._peripheral._adapter_client.button_b
            );
        }
    }

    get_analog_input(args) {
        if (args.ANALOG_PIN === "1") {
            return this._peripheral._adapter_client.pin_one;
        } else if (args.ANALOG_PIN === "2") {
            return this._peripheral._adapter_client.pin_two;
        }
    }

    get_accelerometer(args) {
        if (args.ACCELEROMETER_PARAM === "X") {
            return this._peripheral._adapter_client.x;
        } else if (args.ACCELEROMETER_PARAM === "Y") {
            return this._peripheral._adapter_client.y;
        } else if (args.ACCELEROMETER_PARAM === "Z") {
            return this._peripheral._adapter_client.z;
        }
    }
    buttonIsPressed(args) {
        if (args.BUTTON_PARAM === "A") {
            return this._peripheral._adapter_client.button_a;
        } else if (args.BUTTON_PARAM === "B") {
            return this._peripheral._adapter_client.button_b;
        } else if (args.BUTTON_PARAM === "A+B") {
            return (
                this._peripheral._adapter_client.button_a &&
                this._peripheral._adapter_client.button_b
            );
        }
    }
    say(args) {
        var python_code = `display.scroll('${args.TEXT}', wait=False, loop=False)`;
        return this._peripheral._adapter_client.adapter_base_client.emit_with_messageid(
            NODE_ID,
            python_code
        );
    }

    displaySymbol(args) {
        // console.log("MATRIX->", args.MATRIX);
        const symbol = cast.toString(args.MATRIX).replace(/\s/g, "");
        //console.log("symbol->", symbol);
        var symbol_code = "";
        for (var i = 0; i < symbol.length; i++) {
            if (i % 5 == 0 && i != 0) {
                symbol_code = symbol_code + ":";
            }
            if (symbol[i] != "0") {
                symbol_code = symbol_code + "7";
            } else {
                symbol_code = symbol_code + "0";
            }
        }

        var python_code = `display.show(Image("${symbol_code}"), wait=True, loop=False)`;
        // console.log(python_code);
        return this._peripheral._adapter_client.adapter_base_client.emit_with_messageid(
            NODE_ID,
            python_code
        );
    }
    clearScreen(args) {
        var python_code = `display.clear()`;
        return this._peripheral._adapter_client.adapter_base_client.emit_with_messageid(
            NODE_ID,
            python_code
        );
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
                return Math.round(this._peripheral._adapter_client.y / -10);
            case MicroBitTiltDirection.BACK:
                return Math.round(this._peripheral._adapter_client.y / 10);
            case MicroBitTiltDirection.LEFT:
                return Math.round(this._peripheral._adapter_client.x / -10);
            case MicroBitTiltDirection.RIGHT:
                return Math.round(this._peripheral._adapter_client.x / 10);
            default:
                log.warn(`Unknown tilt direction in _getTiltAngle: ${args}`);
        }
    }

    _isTilted(args) {
        switch (args) {
            case MicroBitTiltDirection.ANY:
                return (
                    Math.abs(this._peripheral._adapter_client.x / 10) >=
                        Scratch3UsbMicrobitBlocks.TILT_THRESHOLD ||
                    Math.abs(this._peripheral._adapter_client.y / 10) >=
                        Scratch3UsbMicrobitBlocks.TILT_THRESHOLD
                );
            default:
                console.log(args);
                return (
                    this._getTiltAngle(args) >=
                    Scratch3UsbMicrobitBlocks.TILT_THRESHOLD
                );
        }
    }

    get_gesture(args) {
        switch (args.gesture) {
            case this._peripheral._adapter_client.gesture:
                return true;
            default:
                return false;
        }
    }

    control_extension(args) {
        const content = args.turn;
        const ext_name = args.ext_name;
        return this._peripheral._adapter_client.adapter_base_client.emit_with_messageid_for_control(
            NODE_ID,
            content,
            ext_name,
            "extension"
        );
    }

    open_help_url(args) {
        window.open(HELP_URL);
    }

    flash_firmware(args) {
        return new Promise((resolve) => {
            fetch(
                `https://codelab-adapter.codelab.club:12358/api/message/flash`,
                {
                    body: JSON.stringify({
                        message: "flash_usb_microbit",
                    }),
                    headers: {
                        "content-type": "application/json",
                    },
                    method: "POST",
                }
            )
                .then((res) => res.json())
                .then((ret) => {
                    const poem = ret.status;
                    resolve(`${poem}`);
                });
        });
    }

    update_ports(args) {
        // 更新到一个变量里
        const code = `microbitHelper.update_ports()`; // 广播 , 收到特定信息更新变量
        //this.socket.emit("actuator", { topic: TOPIC, payload: message });
        return this._peripheral._adapter_client.adapter_base_client.emit_with_messageid(
            NODE_ID,
            code
        );
    }

    connect(args) {
        const port = args.port;
        const code = `microbitHelper.connect("${port}")`;
        //this.socket.emit("actuator", { topic: TOPIC, payload: message });
        return this._peripheral._adapter_client.adapter_base_client.emit_with_messageid(
            NODE_ID,
            code
        );
    }

}

module.exports = Scratch3UsbMicrobitBlocks;
