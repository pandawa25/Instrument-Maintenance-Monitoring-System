import { ArgumentMetadata, BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Injectable()
export class ParseUuidPipe implements PipeTransform<string> {
  transform(value: string, metadata: ArgumentMetadata): string {
    if (!UUID_REGEX.test(value)) {
      throw new BadRequestException(`${metadata.data ?? 'id'} harus berupa UUID yang valid`);
    }
    return value;
  }
}
