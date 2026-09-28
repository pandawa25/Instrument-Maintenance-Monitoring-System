import { CallHandler, ExecutionContext, Injectable, NestInterceptor, StreamableFile } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * Menyeragamkan response sukses:
 * - Endpoint list (repository sudah mengembalikan { data, meta }) diteruskan apa adanya.
 * - Endpoint single-resource (create/update/findOne) dibungkus jadi { data }.
 * - StreamableFile (mis. download template Excel) diteruskan apa adanya — membungkusnya
 *   akan merusak mekanisme file-streaming bawaan Nest.
 */
@Injectable()
export class ResponseTransformInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((result) => {
        if (result instanceof StreamableFile) {
          return result;
        }
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
