export type HttpResponse = {status: number, html?: string, value?: number};
export type TimeDataset = {time: Array<number>, data: Array<number>};
export type ParseResult = {val? : number | TimeDataset, type?: "historic" | "live", isError: boolean}
export type ConfigValue = {func: (param: string) => Promise<ParseResult>, field_to_run: string, output_field: string, type: "historic" | "live", weight: number};
export type RecordValue = {data: Array<number>, time: Array<number>, last_modified: number, count: number,};
export type StageRankValue = {title: string, val: number};
export type RemoteConfigValue = {slow: number, fast: number, threshold: number,};