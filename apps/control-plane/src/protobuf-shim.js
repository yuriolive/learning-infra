// eslint-disable-next-line import/no-unresolved
import pb from "protobufjs-light-build";

// Re-export all properties from the light build
export const {
  common,
  util,
  configure,
  Writer,
  Reader,
  roots,
  rpc,
  mtype,
  Type,
  Field,
  OneOf,
  Enum,
  Service,
  Method,
  Message,
  Wrapper,
  types,
  MapField,
  ReflectionObject,
  Namespace,
  Root,
  parse,
  tokenize,
  verifier,
  converter,
  decoder,
  encoder,
} = pb;
// eslint-disable-next-line import/no-unresolved
export { default } from "protobufjs-light-build";
