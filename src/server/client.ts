// import moment from 'moment';
import WebSocket from 'ws';
import * as CST from '../common/constants';
import { Dict, IRelayerInfo, IRelayerMessage, IStake } from '../common/types';
import util from '../utils/util';

const moduleName = 'Client';
export default class Client {
	public relayers: Dict<string, WebSocket> = {};
	public relayersInfo: Dict<string, IRelayerInfo> = {};
	public uiSocketServer: WebSocket.Server | null = null;
	public uiSocket: WebSocket | null = null;

	public account: string = '0x1';

	constructor() {
		const logHeader = `[${moduleName}.Contructor]: `;
		this.uiSocketServer = new WebSocket.Server({
			port: CST.UI_SOCKET_PORT
		});
		if (this.uiSocketServer)
			this.uiSocketServer.on('connection', uiWS => {
				util.logInfo(logHeader + 'Connected');
				// console.log(uiWS);
				uiWS.on('message', msg => {
					util.logInfo(logHeader + `MsgFromUI: ${JSON.stringify(msg)}`);
					this.handleUIMessage(msg);
				});
				uiWS.on('close', () => {
					util.logInfo(logHeader + `UI Socket closed`);
					this.uiSocket = null;
				});
				this.uiSocket = uiWS;
			});

		for (const relayerID of CST.RELAYER_PORTS) {
			const relayerWSLink = `ws://localhost:${relayerID}`;
			this.relayers[relayerID] = new WebSocket(relayerWSLink);
			this.relayers[relayerID].on('open', () => {
				this.relayers[relayerID].on('message', msg => {
					this.handleRelayerMessage(msg);
				});
				this.relayers[relayerID].on('close', () => {
					util.logInfo(logHeader + `[${relayerID}]: Relayer Closed`);
				});
			});
		}
	}

	public handleRelayerMessage(msg: any) {
		const logHeader = `[${moduleName}.handleRelayerMessage]: `;
		const message: IRelayerMessage = JSON.parse(msg);
		switch (message.op) {
			case 'updatePrice':
				this.onRelayerPriceUpdate(message);
				break;
			case 'setAccount':
				this.onRelayerReplySetAccount(message);
				break;
			default:
				util.logInfo(logHeader + `No such command: ${message.op} `);
				break;
		}
	}

	public onRelayerReplySetAccount(message: IRelayerMessage) {
		const logHeader = `[${moduleName}.onRelayerSetAccount]: `;
		const data = message.data;
		if (this.account !== data.accountId) {
			console.log(
				logHeader +
					`Error: Client Account: ${this.account} not equal Relayer Account ${
						data.accountId
					}`
			);
			util.logInfo(logHeader + `Resending setAccount to relayer`);
			this.onUISetAccount({ accountId: this.account });
		} else {
			util.logInfo(logHeader + `setAccount successful`);
			this.relayersInfo[data.relayerID] = data;
			const msgToUI = {
				op: 'update',
				relayerInfo: message.data
			};
			if (this.uiSocket) this.uiSocket.send(JSON.stringify(msgToUI));
		}
	}

	public onRelayerPriceUpdate(message: IRelayerMessage) {
		const logHeader = `[${moduleName}.onRelayerPriceUpdate]: `;
		const data = message.data;
		const relayerID = data.relayerID;
		this.relayersInfo[relayerID] = data;
		console.log(
			logHeader +
				`[${this.relayersInfo[relayerID].relayerID}]:${JSON.stringify(
					this.relayersInfo[relayerID]
				)}`
		);
		this.relayersInfo[data.relayerID] = data;
		const msgToUI = { op: 'update', relayersInfo: this.relayersInfo };
		if (this.uiSocket) this.uiSocket.send(JSON.stringify(msgToUI));
	}

	public handleUIMessage(msg: any) {
		const logHeader = `[${moduleName}.onUIMessage]:`;
		util.logInfo(logHeader + msg);
		const message = JSON.parse(msg);
		switch (message.op) {
			case 'stake':
				this.onUIStake(message.data);
				break;
			case 'setAccount':
				this.onUISetAccount(message.data);
				break;
			default:
				util.logInfo(logHeader + `No such command: ${message.op}`);
				break;
		}
	}

	public onUISetAccount(data: { accountId: string }) {
		this.account = data.accountId;
		const message = { op: 'setAccount', data: { accountId: this.account } };
		for (const relayerID in this.relayers)
			this.relayers[relayerID].send(JSON.stringify(message));
	}

	public onUIStake(stake: IStake) {
		const relayerID = stake.relayerID;
		const message = { op: 'stake', data: stake };
		this.relayers[relayerID].send(JSON.stringify(message));
	}
}
