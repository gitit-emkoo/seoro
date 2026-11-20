import { Injectable } from '@nestjs/common';
import { APP_NAME, APP_NAME_EN } from '@seoro/shared';

@Injectable()
export class AppService {
  getHealth() {
    return {
      ok: true,
      service: APP_NAME_EN,
      name: APP_NAME,
    };
  }
}
