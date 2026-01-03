import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';

export interface UserContext {
  id: string;
  email: string;
  roles: string[];
}

@Injectable()
export class UserContextService {
  private readonly als = new AsyncLocalStorage();

  run(store: UserContext, callback: () => void) {
    this.als.run(store, callback);
  }

  getUser() {
    return this.als.getStore();
  }

  setUser(user: UserContext) {
    const store = this.als.getStore();
    if (store) {
      Object.assign(store, user);
    }
  }
}
