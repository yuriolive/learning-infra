import pb from "protobufjs/dist/light/protobuf.js";

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
export { default } from "protobufjs/dist/light/protobuf.js";
