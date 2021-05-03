import {Router, URLOptions, NavigationOptions} from '@layr/router';
import {hasOwnProperty} from 'core-helpers';

import type {RoutableComponent} from './routable';
import type {Route, RouteOptions} from './route';
import type {WrapperOptions} from './wrapper';
import type {Pattern} from './pattern';
import {isRoutableClassOrInstance} from './utilities';

/**
 * Defines a [route](https://layrjs.com/docs/v1/reference/route) for a static or instance method in a [routable component](https://layrjs.com/docs/v1/reference/routable#routable-component-class).
 *
 * @param pattern The canonical [URL pattern](https://layrjs.com/docs/v1/reference/route#url-pattern-type) of the route.
 * @param [options] An object specifying the options to pass to the `Route`'s [constructor](https://layrjs.com/docs/v1/reference/route#constructor) when the route is created.
 *
 * @details
 * **Shortcut functions:**
 *
 * In addition to defining a route, the decorator adds some shortcut functions to the decorated method so that you can interact with the route more easily.
 *
 * For example, if you define a `route` for a `Home()` method you automatically get the following functions:
 *
 * - `Home.matchURL(url)` is the equivalent of [`route.matchURL(url)`](https://layrjs.com/docs/v1/reference/route#match-url-instance-method).
 * - `Home.generateURL(params, options)` is the equivalent of [`route.generateURL(params, options)`](https://layrjs.com/docs/v1/reference/route#generate-url-instance-method).
 *
 * If the defined `route` is controlled by a [`router`](https://layrjs.com/docs/v1/reference/router), you also get the following shortcut functions:
 *
 * - `Home.navigate(params, options)` is the equivalent of [`router.navigate(url, options)`](https://layrjs.com/docs/v1/reference/router#navigate-instance-method) where `url` is generated by calling [`route.generateURL(params, options)`](https://layrjs.com/docs/v1/reference/route#generate-url-instance-method).
 * - `Home.redirect(params, options)` is the equivalent of [`router.redirect(url, options)`](https://layrjs.com/docs/v1/reference/router#redirect-instance-method) where `url` is generated by calling [`route.generateURL(params, options)`](https://layrjs.com/docs/v1/reference/route#generate-url-instance-method).
 * - `Home.reload(params, options)` is the equivalent of [`router.reload(url)`](https://layrjs.com/docs/v1/reference/router#reload-instance-method) where `url` is generated by calling [`route.generateURL(params, options)`](https://layrjs.com/docs/v1/reference/route#generate-url-instance-method).
 * - `Home.isActive(params)` returns a boolean indicating whether the `route`'s URL (generated by calling [`route.generateURL(params)`](https://layrjs.com/docs/v1/reference/route#generate-url-instance-method)) matches the current `router`'s URL.
 *
 * Lastly, if the defined `route` is controlled by a [`router`](https://layrjs.com/docs/v1/reference/router) that is created by using the [`useBrowserRouter()`](https://layrjs.com/docs/v1/reference/react-integration#use-browser-router-react-hook) React hook, you also get the following shortcut function:
 *
 * - `Home.Link({params, hash, ...props})` is the equivalent of [`router.Link({to, ...props})`](https://layrjs.com/docs/v1/reference/browser-router#link-instance-method) where `to` is generated by calling [`route.generateURL(params, {hash})`](https://layrjs.com/docs/v1/reference/route#generate-url-instance-method).
 *
 * @examplelink See an example of use in the [`BrowserRouter`](https://layrjs.com/docs/v1/reference/browser-router) class.
 *
 * @category Decorators
 * @decorator
 */
export function route(pattern: Pattern, options: RouteOptions = {}) {
  return function (
    target: typeof RoutableComponent | RoutableComponent,
    name: string,
    descriptor: PropertyDescriptor
  ) {
    const {value: method, get: originalGet, configurable, enumerable} = descriptor;

    if (
      !(
        isRoutableClassOrInstance(target) &&
        (typeof method === 'function' || originalGet !== undefined) &&
        enumerable === false
      )
    ) {
      throw new Error(
        `@route() should be used to decorate a routable component method (property: '${name}')`
      );
    }

    const route: Route = target.setRoute(name, pattern, options);

    const decorate = function (
      this: typeof RoutableComponent | RoutableComponent,
      method: Function
    ) {
      const component = this;

      defineMethod(method, 'matchURL', function (url: URL | string) {
        return route.matchURL(url);
      });

      defineMethod(method, 'generateURL', function (params?: any, options?: URLOptions) {
        return route.generateURL(component, params, options);
      });

      defineMethod(method, 'generatePath', function () {
        return route.generatePath(component);
      });

      defineMethod(method, 'generateQueryString', function (params?: any) {
        return route.generateQueryString(params);
      });

      Object.defineProperty(method, '__isDecorated', {value: true});
    };

    const decorateWithRouter = function (
      this: typeof RoutableComponent | RoutableComponent,
      method: Function,
      router: Router
    ) {
      defineMethod(
        method,
        'navigate',
        function (this: Function, params?: any, options?: URLOptions & NavigationOptions) {
          return router.navigate(this.generateURL(params, options), options);
        }
      );

      defineMethod(
        method,
        'redirect',
        function (this: Function, params?: any, options?: URLOptions & NavigationOptions) {
          return router.redirect(this.generateURL(params, options), options);
        }
      );

      defineMethod(method, 'reload', function (this: Function, params?: any, options?: URLOptions) {
        router.reload(this.generateURL(params, options));
      });

      defineMethod(method, 'isActive', function (this: Function) {
        const currentPath = router.getCurrentPath();
        const routePath = this.generatePath();

        return routePath === currentPath;
      });

      router.applyCustomRouteDecorators(this, method);

      Object.defineProperty(method, '__isDecoratedWithRouter', {value: true});
    };

    const defineMethod = function (object: any, name: string, func: Function) {
      Object.defineProperty(object, name, {
        value: func,
        writable: true,
        enumerable: false,
        configurable: true
      });
    };

    const get = function (this: typeof RoutableComponent | RoutableComponent) {
      // TODO: Don't assume that `originalGet` returns a bound method (like when @view() is used).
      // We should return a bound method in any case to make instance routes work
      // (see `decorator.test.ts`)

      const actualMethod = originalGet !== undefined ? originalGet.call(this) : method;

      if (typeof actualMethod !== 'function') {
        throw new Error(`@route() can only be used on methods`);
      }

      if (!hasOwnProperty(actualMethod, '__isDecorated')) {
        decorate.call(this, actualMethod);
      }

      if (!hasOwnProperty(actualMethod, '__isDecoratedWithRouter')) {
        if (this.hasRouter()) {
          decorateWithRouter.call(this, actualMethod, this.getRouter());
        }
      }

      return actualMethod;
    };

    return {get, configurable, enumerable};
  };
}

export function wrapper(pattern: Pattern, options: WrapperOptions = {}) {
  return function (
    target: typeof RoutableComponent | RoutableComponent,
    name: string,
    descriptor: PropertyDescriptor
  ) {
    const {value: method, get, enumerable} = descriptor;

    if (
      !(
        isRoutableClassOrInstance(target) &&
        (typeof method === 'function' || get !== undefined) &&
        enumerable === false
      )
    ) {
      throw new Error(
        `@wrapper() should be used to decorate a routable component method (property: '${name}')`
      );
    }

    target.setWrapper(name, pattern, options);

    return descriptor;
  };
}
