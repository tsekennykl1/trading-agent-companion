import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { RouteErrorFallback, RouteNotFoundFallback } from "./components/RouteFallbacks";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    // Any route without its own handling gets a readable screen instead of a
    // blank page: unmatched paths, loader throws and render errors all land
    // on one of these two.
    defaultErrorComponent: RouteErrorFallback,
    defaultNotFoundComponent: RouteNotFoundFallback,
    defaultOnCatch: (error) => {
      console.error(error);
    },
  });

  return router;
};
