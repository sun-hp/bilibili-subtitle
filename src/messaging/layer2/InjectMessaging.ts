import Layer1Protocol from '../layer1/Layer1Protocol'
import { L2ReqMsg, L2ResMsg, MESSAGE_TO_EXTENSION_HANDSHAKE, MESSAGE_TO_EXTENSION_ROUTE, TAG_TARGET_APP, TAG_TARGET_INJECT } from '../const'

class InjectMessaging {
    port?: chrome.runtime.Port
    l1protocol?: Layer1Protocol<L2ReqMsg, L2ResMsg>
    //类实例
    methods?: {
        [key: string]: (params: any, context: MethodContext) => Promise<L2ResMsg>
    }

    debug = (...args: any[]) => {
        console.debug('[Inject Messaging]', ...args)
    }

    messageHandler = async (req: L2ReqMsg): Promise<L2ResMsg> => {
        this.debug(`[${req.from}] ${req.method}`, JSON.stringify(req))

        // check event target
        // if (req.target !== MESSAGE_TARGET_INJECT) return Promise.resolve({
        //     success: false,
        //     code: 501,
        //     message: 'Target Error: ' + req.target,
        // })

        const method = this.methods?.[req.method]
        if (method != null) {
            return method(req.params, {
                from: req.from,
                event: req,
                // sender,
            }).then(data => {
                // debug(`${source} <= `, event.method, JSON.stringify(data))
                return {
                    code: 200,
                    data,
                }
            }).catch(err => {
                console.error(err)
                let msg
                if (err instanceof Error) {
                    msg = err.message
                } else if (typeof err === 'string') {
                    msg = err
                } else {
                    msg = 'error: ' + JSON.stringify(err)
                }
                return {
                    code: 500,
                    msg,
                }
            })
        } else {
            return {
                code: 501,
                msg: 'Unknown method: ' + req.method,
            }
        }
    }

    init(methods: {
        [K in AllInjectMessages['method']]: (params: Extract<AllInjectMessages, { method: K }>['params'], context: MethodContext) => Promise<any>
    }) {
        this.methods = methods
        this.port = chrome.runtime.connect(import.meta.env.VITE_EXTENSION_ID, {
            name: 'bilibili-inject',
        })
        this.l1protocol = new Layer1Protocol<L2ReqMsg, L2ResMsg>(this.messageHandler, this.port)
        //握手
        this.l1protocol.sendMessage({
            from: 'inject',
            method: 'HANDSHAKE',
            params: {
                tags: [TAG_TARGET_INJECT],
            },
        })
    }

    sendExtension = async <M extends AllExtensionMessages | MessagingExtensionMessages, K extends M['method']>(method: K, params?: Extract<M, { method: K }>['params']): Promise<Extract<M, { method: K }>['return']> => {
        return await this.l1protocol!.sendMessage({
            from: 'inject',
            method,
            params: params ?? {},
        }).then((res) => {
            if (res.code === 200) {
                return res.data
            } else {
                throw new Error(res.msg)
            }
        })
    }

    sendApp = async <M extends AllAPPMessages, K extends M['method']>(method: K, params?: Extract<M, { method: K }>['params']): Promise<Extract<M, { method: K }>['return']> => {
        return this.sendExtension('ROUTE', {
            tags: [TAG_TARGET_APP],
            method,
            params,
        })
    }

}

export default InjectMessaging