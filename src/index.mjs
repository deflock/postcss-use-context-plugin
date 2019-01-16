import postcss from 'postcss';

const PLUGIN_NAME = 'deflock-use-context-plugin';

/**
 *
 */
export default postcss.plugin(PLUGIN_NAME, (opts = {}) => {
    const {
        name,
        atRuleName = 'use-context-plugin',
        plugins,
    } = opts;

    const thisPluginName = name || `${PLUGIN_NAME}-${atRuleName}`;

    return (css, result) => {
        const originalPlugins = result.processor.plugins.slice();
        const usedPlugins = new Set();

        css.walkAtRules(atRuleName, rule => {
            const pluginId = String(rule.params).replace(/^[\s\uFEFF\xA0'"]+|[\s\uFEFF\xA0'"]+$/g, '');

            if (!usedPlugins.has(pluginId)) {
                usedPlugins.add(pluginId);
            }

            rule.remove();
        });

        if (!usedPlugins.size) {
            return;
        }

        // Check if non-existing plugin is used
        for (const pluginId of usedPlugins.values()) {
            if (!plugins.has(pluginId)) {
                throw new Error(`Context plugin "${pluginId}" does not exist`);
            }
        }

        let thisPluginIndex = null;

        result.processor.plugins.forEach((p, index) => {
            if (p.postcssPlugin === thisPluginName) {
                thisPluginIndex = index;
            }
        });

        const contextPlugins = [];

        // Using iteration over plugins instead of usedPlugins allows preserve correct order
        for (let [pluginId, plugin] of plugins.entries()) {
            if (!usedPlugins.has(pluginId)) {
                continue;
            }

            if (plugin.postcss) {
                plugin = plugin.postcss;
            }

            if (plugin.plugins) {
                plugin.plugins.forEach((p) => {
                    contextPlugins.push(p);
                });
            }
            else {
                contextPlugins.push(plugin);
            }
        }

        if (thisPluginIndex !== null) {
            result.processor.plugins = [].concat(
                result.processor.plugins.slice(0, thisPluginIndex + 1),
                contextPlugins,
                result.processor.plugins.slice(thisPluginIndex + 1),
            );
        }
        else {
            result.processor.plugins = result.processor.plugins.concat(contextPlugins);
        }

        const resetPluginName = `${thisPluginName}#reset`;

        // Some use-context plugins may be used within the same postcss processor.
        // Create and push the reset plugin only for the first use-context plugin.
        // Because of this processor plugins will be restored only once.
        for (const plugin of result.processor.plugins) {
            if (plugin.postcssPlugin === resetPluginName) {
                return;
            }
        }

        result.processor.plugins.push(postcss.plugin(resetPluginName, () => {
            // eslint-disable-next-line no-return-assign
            return () => {
                result.processor.plugins = originalPlugins;
            };
        })());
    };
});
