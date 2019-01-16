'use strict';

const postcss = require('postcss');
const plugin = require('..').default;

process.chdir(__dirname);

/**
 * @param {string} input
 * @param {string} expected
 * @param {Object} pluginOptions
 * @param {Object} postcssOptions
 * @param {Array} warnings
 * @returns {Promise}
 */
function run(input, expected, pluginOptions = {}, postcssOptions = {}, warnings = []) {
    return postcss([plugin(pluginOptions)])
        .process(input, Object.assign({from: 'input.css'}, postcssOptions))
        .then((result) => {
            const resultWarnings = result.warnings();
            resultWarnings.forEach((warning, index) => {
                expect(warnings[index]).toEqual(warning.text);
            });
            expect(resultWarnings.length).toEqual(warnings.length);
            expect(result.css).toEqual(expected);
            return result;
        });
}

it('should work', () => {
    run(
        'a { width: 10px }',
        'a { width: 10px }'
    );
});
