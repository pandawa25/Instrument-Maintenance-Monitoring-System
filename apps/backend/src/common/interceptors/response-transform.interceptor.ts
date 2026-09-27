import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * Menyeragamkan response sukses:
 * - Endpoint list (repository sudah mengembalikan { data, meta }) diteruskan apa adanya.
 * - Endpoint single-resource (create/update/findOne) dibungkus jadi { data }.
 */
@Injectable()
export class ResponseTransformInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((result) => {
        if (result && typeof result === 'object' && 'meta' in result && 'data' in result) {
          return result;
        }
        if (result === undefined) {
          return { data: null };
        }
        return { data: result };
      }),
    );
  }
}
