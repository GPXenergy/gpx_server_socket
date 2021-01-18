/**
 * Group meter interface
 */
export interface IGroupMeter {
  pk: number;
  name?: number;

  // The following data is only available in the live data
  r?: {  // all recent participant updates
    pk: number;  // participant pk
    ti: number;  // total_import
    te: number;  // total_export
    tg: number;  // total_gas
    p: number;  // actual_power
    g: number;  // actual_gas
    s: number;  // actual_solar
  }[];
  ti?: number;  // total_import
  te?: number;  // total_export
  tg?: number;  // total_gas
  p?: number;  // actual_power
  g?: number;  // actual_gas
  s?: number;  // actual_solar
}
