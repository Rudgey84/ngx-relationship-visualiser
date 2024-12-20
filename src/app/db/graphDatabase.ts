import { Injectable } from '@angular/core';
import Dexie from 'dexie';
import { Data } from '../models/data.interface';

@Injectable({
  providedIn: 'root'
})
export class DexieService extends Dexie {
  public graphData: Dexie.Table<Data, string>;

  constructor() {
    super('GraphDatabase');
    this.version(1).stores({
      graphData: 'dataId'
    });
    this.graphData = this.table('graphData');
  }

  async saveGraphData(data: Data): Promise<void> {
    await this.graphData.put(data);
  }

  async getGraphData(dataId: string): Promise<Data> {
    return await this.graphData.get(dataId);
  }

  async deleteGraphData(dataId: string): Promise<void> {
    await this.graphData.delete(dataId);
  }
}
