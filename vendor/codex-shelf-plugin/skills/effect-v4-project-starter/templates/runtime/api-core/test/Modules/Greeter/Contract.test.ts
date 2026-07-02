import * as Schema from 'effect/Schema';
import { describe, expect, it } from 'vitest';
import { Api } from '../../../src/Api';
import {
  GreetRequest,
  GreetResponse,
} from '../../../src/Modules/Greeter/Domain';
import { GreeterRpcs } from '../../../src/Modules/Greeter/RpcProtocol';
import { RpcProtocol } from '../../../src/RpcProtocol';

describe('Greeter API/RPC contracts', () => {
  it('decodes greet requests', () => {
    expect(Schema.decodeUnknownSync(GreetRequest)({ name: 'Ada' })).toEqual({
      name: 'Ada',
    });
    expect(() => Schema.decodeUnknownSync(GreetRequest)({})).toThrow();
  });

  it('decodes greet responses', () => {
    expect(
      Schema.decodeUnknownSync(GreetResponse)({ message: 'Hello, Ada!' })
    ).toEqual({
      message: 'Hello, Ada!',
    });
  });

  it('exports stable HTTP and RPC root contracts', () => {
    expect(Object.keys(Api.groups)).toEqual(['greeter']);
    expect(RpcProtocol).toBe(GreeterRpcs);
    expect(Array.from(GreeterRpcs.requests.keys())).toEqual(['greeter.greet']);
  });
});
