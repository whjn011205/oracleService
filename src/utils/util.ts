import moment, { DurationInputArg2 } from 'moment';
import request from 'request';
import WebSocket from 'ws';
import * as CST from '../common/constants';
import { IOption } from '../common/types';

class Util {
	public get(url: string, headerOthers?: object): Promise<any> {
		return new Promise((resolve, reject) =>
			request(
				{
					url,
					headers: Object.assign(
						{
							'user-agent': 'node.js'
						},
						headerOthers || {}
					)
				},
				(error: any, res: any, body: any) => {
					if (error) reject(error);
					else if (res.statusCode === 200) resolve(body);
					else reject('Error status ' + res.statusCode + ' ' + res.statusMessage);
				}
			)
		);
	}
	public logLevel: string = CST.LOG_INFO;

	public logInfo(text: any): void {
		this.log(text, CST.LOG_INFO);
	}

	public logDebug(text: any): void {
		this.log(text, CST.LOG_DEBUG);
	}

	public logError(text: any): void {
		this.log(text, CST.LOG_ERROR);
	}

	private log(text: any, level: string): void {
		if (CST.LOG_RANKING[this.logLevel] >= CST.LOG_RANKING[level])
			console.log(`${moment().format('HH:mm:ss.SSS')} [${level}]: ` + text);
	}

	public isNumber(input: any): boolean {
		const num = Number(input);
		return isFinite(num) && !isNaN(num);
	}

	public isEmptyObject(obj: object | undefined | null): boolean {
		if (!obj) return true;

		for (const prop in obj) if (obj.hasOwnProperty(prop)) return false;

		return true;
	}

	public defaultOption: IOption = {
		source: 'infura',
		provider: '',
		gasPrice: 0,
		gasLimit: 0,
		address: ''
	};
	public getUTCNowTimestamp() {
		return moment().valueOf();
	}

	public parseOptions(argv: string[]): IOption {
		const option: IOption = this.defaultOption;
		for (let i = 3; i < argv.length; i++) {
			const args = argv[i].split('=');
			switch (args[0]) {
				case 'source':
					option.source = args[1] || option.source;
					break;
				case 'provider':
					option.provider = args[1] || option.provider;
					break;
				case 'gasPrice':
					option.gasPrice = Number(args[1]) || option.gasPrice;
					break;
				case 'gasLimit':
					option.gasLimit = Number(args[1]) || option.gasLimit;
					break;
				case 'address':
					option.address = args[1] || option.address;
					break;
				default:
					break;
			}
		}

		return option;
	}

	public round(num: string | number) {
		return +(Math.floor((num + 'e+8') as any) + 'e-8');
	}

	public safeWsSend(ws: WebSocket, message: string) {
		try {
			ws.send(message);
			return true;
		} catch (error) {
			this.logError(error);
			return false;
		}
	}

	public sleep(ms: number) {
		return new Promise(resolve => {
			setTimeout(resolve, ms);
		});
	}

	public clone(obj: object) {
		return JSON.parse(JSON.stringify(obj));
	}

	public getDates(length: number, step: number, stepSize: DurationInputArg2, format: string) {
		const dates: string[] = [];
		const date = moment.utc(this.getUTCNowTimestamp());
		for (let i = 0; i < length; i++) {
			dates.push(date.format(format));
			date.subtract(step, stepSize);
		}
		dates.sort((a, b) => a.localeCompare(b));

		return dates;
	}

	public getPeriodStartTimestamp(
		timestamp: number,
		period: number,
		numPeriodsOffset: number
	): number {
		return (
			Math.max(Math.floor(timestamp / 60000 / period + numPeriodsOffset), 0) * 60000 * period
		);
	}

	public getPeriodEndTimestamp(
		timestamp: number,
		period: number,
		numPeriodsOffset: number
	): number {
		return (
			Math.max(Math.ceil(timestamp / 60000 / period + numPeriodsOffset), 0) * 60000 * period
		);
	}
}

const util = new Util();
export default util;
