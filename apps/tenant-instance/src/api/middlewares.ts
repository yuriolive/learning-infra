import { defineMiddlewares, authenticate } from "@medusajs/framework/http";

export default defineMiddlewares({
  routes: [
    {
      matcher: "/hooks/agent",
      method: "POST",
      middlewares: [authenticate("user", ["session", "bearer"])],
    },
  ],
});
