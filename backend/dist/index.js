"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_1 = __importDefault(require("fastify"));
const cors_1 = __importDefault(require("@fastify/cors"));
// CommonJs
const fastify = (0, fastify_1.default)({
    logger: true,
});
fastify.register(cors_1.default, {
// put your options here
});
// Declare a route
fastify.get('/', function (request, reply) {
    reply.send({ hello: 'world' });
});
// Run the server!
fastify.listen({ port: 3000 }, function (err, address) {
    if (err) {
        fastify.log.error(err);
        // process.exit(1);
    }
    // Server is now listening on ${address}
});
