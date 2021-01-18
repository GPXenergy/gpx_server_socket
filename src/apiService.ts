import axios, { AxiosError, AxiosRequestConfig } from 'axios';

import { environment } from './config/env.config';
import { IGroupMeter } from './groupMeter';

/**
 * Api service connects to the API to retrieve group meter data
 */
export class ApiService {
  /**
   * Get a public group meter, client provides the public key for the group meter
   * @param groupMeterKey: the key used to access the public meter
   * @returns Promise which resolves the GroupMeter
   */
  public getPublicGroupMeter(groupMeterKey: string): Promise<IGroupMeter> {
    const config: AxiosRequestConfig = {
      url: `${environment.apiUrl}/api/meters/groups/public/${groupMeterKey}/`,
      method: 'GET'
    };
    return this.makeRequest<IGroupMeter>(config);
  }

  /**
   * Get a private group meter, participating user provides an authorization token
   * @param groupId: id of the group meter
   * @param token: authorization token
   * @returns Promise which resolves the GroupMeter
   */
  public getPrivateGroupMeter(groupId: number, token: string): Promise<IGroupMeter> {
    const config: AxiosRequestConfig = {
      url: `${environment.apiUrl}/api/meters/groups/${groupId}/`,
      method: 'GET',
      headers: {Authorization: `Token ${token}`}
    };
    return this.makeRequest<IGroupMeter>(config);
  }

  /**
   * Get live data for given groups
   * @param groupIds: list id of the group meter
   * @returns Promise which resolves the GroupMeter
   */
  public getGroupLiveData(groupIds: any[]): Promise<IGroupMeter[]> {
    const config: AxiosRequestConfig = {
      url: `${environment.apiUrl}/api/meters/groups/live-data/`,
      method: 'GET',
      params: {groups: groupIds.join(','), token: environment.apiKey}
    };
    return this.makeRequest<IGroupMeter[]>(config);
  }

  /**
   * Make a request and resolve the response data
   * @param config
   */
  private makeRequest<T>(config: AxiosRequestConfig): Promise<T> {
    return new Promise((resolve, reject) => {
      axios(config).then(res => {
        resolve(res.data || null);
      }).catch((error: AxiosError) => {
        reject(error);
      });
    });
  }

}
