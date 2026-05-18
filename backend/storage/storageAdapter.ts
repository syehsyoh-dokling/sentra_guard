export interface StorageObject {
  key: string;
  contentType: string;
  body: string;
}

export interface StorageAdapter {
  putObject(object: StorageObject): Promise<string>;
  getObject(key: string): Promise<StorageObject | undefined>;
}

export class InMemoryStorageAdapter implements StorageAdapter {
  private readonly objects = new Map<string, StorageObject>();

  async putObject(object: StorageObject): Promise<string> {
    this.objects.set(object.key, object);
    return `memory://${object.key}`;
  }

  async getObject(key: string): Promise<StorageObject | undefined> {
    return this.objects.get(key);
  }
}

export const storageAdapter = new InMemoryStorageAdapter();
