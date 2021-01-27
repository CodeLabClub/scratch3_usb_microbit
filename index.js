const ArgumentType = require("../../extension-support/argument-type");
const BlockType = require("../../extension-support/block-type");
const formatMessage = require("format-message");
const cast = require("../../util/cast");
const log = require("../../util/log");
const AdapterBaseClient = require("../scratch3_eim/codelab_adapter_base.js");
const ScratchUIHelper = require("../scratch3_eim/scratch_ui_helper.js");

/*
https://github.com/LLK/scratch-vm/blob/develop/src/extensions/scratch3_microbit/index.js#L84
放弃Scratch愚蠢丑陋的UI连接
*/

const blockIconURI = 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4NCjwhLS0gR2VuZXJhdG9yOiBBZG9iZSBJbGx1c3RyYXRvciAyNC4wLjAsIFNWRyBFeHBvcnQgUGx1Zy1JbiAuIFNWRyBWZXJzaW9uOiA2LjAwIEJ1aWxkIDApICAtLT4NCjxzdmcgdmVyc2lvbj0iMS4xIiBpZD0i5Zu+5bGCXzEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHg9IjBweCIgeT0iMHB4Ig0KCSB2aWV3Qm94PSIwIDAgNDAgNDAiIHN0eWxlPSJlbmFibGUtYmFja2dyb3VuZDpuZXcgMCAwIDQwIDQwOyIgeG1sOnNwYWNlPSJwcmVzZXJ2ZSI+DQo8c3R5bGUgdHlwZT0idGV4dC9jc3MiPg0KCS5zdDB7ZmlsbDojRkZGRkZGO30NCjwvc3R5bGU+DQo8dGl0bGU+5omp5bGV5o+S5Lu26YWN5Zu+6K6+6K6hPC90aXRsZT4NCjxnIGlkPSJfMS5fdXNiIj4NCgk8cGF0aCBjbGFzcz0ic3QwIiBkPSJNMjcuNiwxMC4xTDEyLjUsMTBjLTUuNSwwLTkuOSw0LjQtMTAsOS45bDAsMGMwLDUuNSw0LjQsOS45LDkuOSwxMEwyNy41LDMwYzUuNSwwLDkuOS00LjQsMTAtOS45bDAsMA0KCQlDMzcuNSwxNC42LDMzLjEsMTAuMiwyNy42LDEwLjF6IE0zMy4xLDIwLjFjMCwzLjItMi42LDUuOC01LjgsNS44bC0xNC44LTAuMWMtMy4yLDAtNS44LTIuNi01LjgtNS44bDAsMGMwLTMuMiwyLjYtNS44LDUuOC01LjgNCgkJbDE0LjgsMC4xQzMwLjUsMTQuMywzMy4xLDE2LjksMzMuMSwyMC4xeiIvPg0KCTxjaXJjbGUgY2xhc3M9InN0MCIgY3g9IjEzLjYiIGN5PSIyMCIgcj0iMiIvPg0KCTxjaXJjbGUgY2xhc3M9InN0MCIgY3g9IjI2LjQiIGN5PSIyMCIgcj0iMiIvPg0KPC9nPg0KPC9zdmc+DQo=';
const menuIconURI = 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4KPCEtLSBHZW5lcmF0b3I6IEFkb2JlIElsbHVzdHJhdG9yIDI0LjAuMCwgU1ZHIEV4cG9ydCBQbHVnLUluIC4gU1ZHIFZlcnNpb246IDYuMDAgQnVpbGQgMCkgIC0tPgo8c3ZnIHZlcnNpb249IjEuMSIgaWQ9IuWbvuWxgl8xIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB4PSIwcHgiIHk9IjBweCIKCSB2aWV3Qm94PSIwIDAgNDAgNDAiIHN0eWxlPSJlbmFibGUtYmFja2dyb3VuZDpuZXcgMCAwIDQwIDQwOyIgeG1sOnNwYWNlPSJwcmVzZXJ2ZSI+Cjx0aXRsZT7mianlsZXmj5Lku7bphY3lm77orr7orqE8L3RpdGxlPgo8ZyBpZD0iXzEuX3VzYiI+Cgk8cGF0aCBkPSJNMjguNSw5TDExLjYsOC45Yy02LjEsMC0xMS4xLDQuOS0xMS4xLDExbDAsMEMwLjUsMjYsNS40LDMxLDExLjUsMzFsMTYuOSwwLjFjNi4xLDAsMTEuMS00LjksMTEuMS0xMWwwLDAKCQlDMzkuNSwxNCwzNC42LDksMjguNSw5eiBNMzQuNiwyMC4xYzAsMy42LTIuOSw2LjQtNi41LDYuNGwtMTYuNS0wLjFjLTMuNiwwLTYuNS0yLjktNi40LTYuNWwwLDBjMC0zLjYsMi45LTYuNCw2LjUtNi40bDE2LjUsMC4xCgkJQzMxLjcsMTMuNiwzNC42LDE2LjUsMzQuNiwyMC4xeiIvPgoJPGNpcmNsZSBjeD0iMTIuOSIgY3k9IjIwIiByPSIyLjIiLz4KCTxjaXJjbGUgY3g9IjI3LjEiIGN5PSIyMCIgcj0iMi4yIi8+CjwvZz4KPC9zdmc+Cg==';

const SCRATCH_EXT_ID = "usb_microbit"; //vm gui 与此一致
const NODE_NAME = `extension_${SCRATCH_EXT_ID}`;
const NODE_ID = `eim/${NODE_NAME}`;
const NODE_MIN_VERSION = "2.0.0"; //node最低版本， 依赖
const HELP_URL = `https://adapter.codelab.club/extension_guide/microbit/`;


const FormHelp = {
    en: "help",
    "zh-cn": "帮助",
};

const FormReset = {
    en: "reset",
    "zh-cn": "重置",
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

    notify_callback(msg) {
        // 使用通知机制直到自己退出
        // todo 重置
        console.log("notify_callback ->", msg);
        if (msg.message === `停止 ${this.NODE_ID}`) {
            this.ScratchUIHelper.reset();
        }
        if (msg.message === `${this.NODE_ID} 已断开`) {
            this.ScratchUIHelper.reset();
        }
        if (msg.message === `micro:bit 连接异常`) {
            this.ScratchUIHelper.reset();
        }
        
        if (msg.message === `正在刷入固件...`) {
            // https://github.com/LLK/scratch-vm/blob/3e65526ed83d6ef769bd33e4b73e87b8e7184c9b/src/engine/runtime.js#L637
            setTimeout(() => {
                this._runtime.emit(
                    this._runtime.constructor.PERIPHERAL_REQUEST_ERROR,
                    {
                        message: `固件已烧录，请重新连接`,
                        extensionId: "microbitRadio",
                    }
                );
                // reject(`timeout(${timeout}ms)`);
            }, 12000);
        }
    }
    constructor(node_id, help_url, runtime, _Blocks) {
        this.NODE_ID = node_id;
        this.HELP_URL = help_url;
        this._runtime = runtime;
        this._Blocks = _Blocks;

        this.adapter_base_client = new AdapterBaseClient(
            null, // onConnect,
            null, // onDisconnect,
            null, // onMessage,
            this.onAdapterPluginMessage.bind(this), // onAdapterPluginMessage,
            null, // update_nodes_status,
            null, // node_statu_change_callback,
            this.notify_callback.bind(this),
            null, // error_message_callback,
            null, // update_adapter_status
            20,
            runtime
        );

        let list_timeout = 10000;
        // 生成 UI 类
        this.ScratchUIHelper = new ScratchUIHelper(
            //SCRATCH_EXT_ID,
            "usbMicrobit",
            NODE_NAME,
            NODE_ID,
            NODE_MIN_VERSION,
            runtime,
            this.adapter_base_client,
            list_timeout
        );

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
        this._runtime.registerPeripheralExtension("usbMicrobit", this);
        // this._runtime.registerPeripheralExtension(Scratch3UsbMicrobitBlocks.EXTENSION_ID, this._peripheral); // 主要使用UI runtime
        this.client = new Client(NODE_ID, HELP_URL, runtime, this); // this is microbitRadioBlocks
    }

    scan() {
        return this.client.ScratchUIHelper.scan();
    }
    connect(id) {
        return this.client.ScratchUIHelper.connect(id, 13000);
    }
    disconnect() {
        return this.client.ScratchUIHelper.disconnect();
    }
    reset() {
        return this.client.ScratchUIHelper.reset();
    }
    isConnected() {
        return this.client.ScratchUIHelper.isConnected();
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
            name: "USB micro:bit",
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
                    opcode: "control_extension",
                    blockType: BlockType.COMMAND,
                    text: FormReset[the_locale],
                },
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
                    opcode: "python_eval",
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: "usbMicrobit.python_eval",
                        default: "eval [CODE]",
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
            },
        };
    }

    python_eval(args) {
        const python_code = `thing.send_command('''${args.CODE}''')`;
        return this.client.adapter_base_client.emit_with_messageid(
            NODE_ID,
            python_code
        );
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
        var python_code = `thing.send_command('''display.show(${
            convert[args.ICON_PARAM]
        }, wait = True, loop = False)''')`; // console.log(args.ICON_PARAM);

        return this.client.adapter_base_client.emit_with_messageid(
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
            return this.client.button_a;
        } else if (args.BUTTON_PARAM === "B") {
            return this.client.button_b;
        } else if (args.BUTTON_PARAM === "A+B") {
            return (
                this.client.button_a &&
                this.client.button_b
            );
        }
    }

    get_analog_input(args) {
        if (args.ANALOG_PIN === "1") {
            return this.client.pin_one;
        } else if (args.ANALOG_PIN === "2") {
            return this.client.pin_two;
        }
    }

    get_accelerometer(args) {
        if (args.ACCELEROMETER_PARAM === "X") {
            return this.client.x;
        } else if (args.ACCELEROMETER_PARAM === "Y") {
            return this.client.y;
        } else if (args.ACCELEROMETER_PARAM === "Z") {
            return this.client.z;
        }
    }
    buttonIsPressed(args) {
        if (args.BUTTON_PARAM === "A") {
            return this.client.button_a;
        } else if (args.BUTTON_PARAM === "B") {
            return this.client.button_b;
        } else if (args.BUTTON_PARAM === "A+B") {
            return (
                this.client.button_a &&
                this.client.button_b
            );
        }
    }
    say(args) {
        var python_code = `thing.send_command('''display.scroll("${args.TEXT}", wait=False, loop=False)''')`;
        return this.client.adapter_base_client.emit_with_messageid(
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

        var python_code = `thing.send_command('''display.show(Image("${symbol_code}"), wait=True, loop=False)''')`;
        // console.log(python_code);
        return this.client.adapter_base_client.emit_with_messageid(
            NODE_ID,
            python_code
        );
    }
    clearScreen(args) {
        var python_code = `thing.send_command('''display.clear()''')`;
        return this.client.adapter_base_client.emit_with_messageid(
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
                return Math.round(this.client.y / -10);
            case MicroBitTiltDirection.BACK:
                return Math.round(this.client.y / 10);
            case MicroBitTiltDirection.LEFT:
                return Math.round(this.client.x / -10);
            case MicroBitTiltDirection.RIGHT:
                return Math.round(this.client.x / 10);
            default:
                log.warn(`Unknown tilt direction in _getTiltAngle: ${args}`);
        }
    }

    _isTilted(args) {
        switch (args) {
            case MicroBitTiltDirection.ANY:
                return (
                    Math.abs(this.client.x / 10) >=
                        Scratch3UsbMicrobitBlocks.TILT_THRESHOLD ||
                    Math.abs(this.client.y / 10) >=
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
            case this.client.gesture:
                return true;
            default:
                return false;
        }
    }

    control_extension(args) {
        const content = "stop";
        const ext_name = NODE_NAME;
        return this.client.adapter_base_client.emit_with_messageid_for_control(
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

    /*
    update_ports(args) {
        // 更新到一个变量里
        const code = `microbitHelper.update_ports()`; // 广播 , 收到特定信息更新变量
        //this.socket.emit("actuator", { topic: TOPIC, payload: message });
        return this.client.adapter_base_client.emit_with_messageid(
            NODE_ID,
            code,
            10000
        );
    }

    connect(args) {
        const port = args.port;
        const code = `microbitHelper.connect("${port}")`;
        //this.socket.emit("actuator", { topic: TOPIC, payload: message });
        return this.client.adapter_base_client.emit_with_messageid(
            NODE_ID,
            code
        );
    }*/

}

module.exports = Scratch3UsbMicrobitBlocks;
