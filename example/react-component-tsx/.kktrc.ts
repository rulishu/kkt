import webpack, {Configuration} from 'webpack';
import path from 'path';
import { DevServerConfigFunction } from 'kkt';
import WebpackDevServer from 'webpack-dev-server';
import lessModules from '@kkt/less-modules';
import rawModules from '@kkt/raw-modules';
import scopePluginOptions from '@kkt/scope-plugin-options';
import { ParsedArgs } from 'minimist';
import pkg from './package.json';

export default (conf: Configuration, env: string, options: ParsedArgs) => {
  conf = rawModules(conf, env, { ...options });
  conf = scopePluginOptions(conf, env, {
    ...options,
    allowedFiles: [
      path.resolve(process.cwd(), 'README.md')
    ]
  });
  conf = lessModules(conf, env, options);
  // Get the project version.
  conf.plugins!.push(new webpack.DefinePlugin({
    VERSION: JSON.stringify(pkg.version),
  }));
  return conf;
}


export const devServer = (configFunction: DevServerConfigFunction) => (proxy:WebpackDevServer.ProxyConfigArrayItem[], allowedHost: string) => {
  // Create the default config by calling configFunction with the proxy/allowedHost parameters
  const config = configFunction(proxy, allowedHost);
  console.log('config:', config)
  // Return your customised Webpack Development Server config.
  return config;
}
