'use strict';

const standard_fonts_tests = [
  null,
  undefined,
  {},
  {select: []},
];

for (const test of standard_fonts_tests) {
  const inputAsString = JSON.stringify(test) ? JSON.stringify(test) : test;

  font_access_test(async t => {
    if (!isPlatformSupported()) {
      await promise_rejects_dom(
          t, 'NotSupportedError', (async () => {
            for await (const f of navigator.fonts.query()) {
            }
          })());
      return;
    }

    const iterator = navigator.fonts.query();

    assert_equals(typeof iterator, 'object', 'query() should return an Object');
    assert_true(
        !!iterator[Symbol.asyncIterator],
        'query() has an asyncIterator method');

    const availableFonts = [];
    for await (const f of iterator) {
      availableFonts.push(f);
    }

    assert_fonts_exist(availableFonts, getEnumerationTestSet());
  }, `query(): standard fonts returned for input: ${inputAsString}`);
}

font_access_test(async t => {
  const iterator = navigator.fonts.query();

  if (!isPlatformSupported()) {
    await promise_rejects_dom(t, 'NotSupportedError', (async () => {
                                for await (const f of iterator) {
                                }
                              })());
    return;
  }

  // The following tests that fonts are sorted. Postscript names are expected to
  // be encoded in a subset of the ASCII character set.
  // See: https://docs.microsoft.com/en-us/typography/opentype/spec/name
  // Should the Postscript name contain characters that are multi-byte, this
  // test may erroneously fail.
  let previousFont = null;
  for await (const font of iterator) {
    if (previousFont) {
      assert_true(
          previousFont.postscriptName < font.postscriptName,
          `font is not in expected order. expected: ${
              previousFont.postscriptName} < ${font.postscriptName}`);
    }

    previousFont = font;
  }
}, 'query(): fonts are sorted');

const select_options_tests = [
  // Platform-agnostic test.
  {select: ['Ahem']},
  // Platform-specific test.
  {select: [getEnumerationTestSet()[0].postscriptName]}
];

for (const test of select_options_tests) {
  font_access_test(async t => {
    if (!isPlatformSupported()) {
      await promise_rejects_dom(
          t, 'NotSupportedError', (async () => {
            for await (const f of navigator.fonts.query()) {
            }
          })());
      return;
    }


    const iterator = navigator.fonts.query(test);

    const fonts = [];
    for await (const f of iterator) {
      fonts.push(f);
    }
    assert_postscript_name_exists(fonts, test.select);
    assert_equals(
        fonts.length, test.select.length,
        'The result length should match the test length.');
  }, `query(): fonts are selected for input: ${JSON.stringify(test)}`);
}

const non_bytestring_input = [
  {select: ['🎵']},
  // UTF-16LE, encodes to the same first four bytes as "Ahem" in ASCII.
  {select: ['\u6841\u6d65']},
  // U+6C34 CJK UNIFIED IDEOGRAPH (water)
  {select: ['\u6C34']},
  // U+1D11E MUSICAL SYMBOL G-CLEF (UTF-16 surrogate pair)
  {select: ['\uD834\uDD1E']},
  // U+FFFD REPLACEMENT CHARACTER
  {select: ['\uFFFD']},
  // UTF-16 surrogate lead
  {select: ['\uD800']},
  // UTF-16 surrogate trail
  {select: ['\uDC00']},
];

for (const test of non_bytestring_input) {
  font_access_test(async t => {
    if (!isPlatformSupported()) {
      await promise_rejects_dom(
          t, 'NotSupportedError', (async () => {
            for await (const f of navigator.fonts.query()) {
            }
          })());
      return;
    }
    await promise_rejects_js(
        t, TypeError, (async () => {
          for await (const f of navigator.fonts.query(test)) {
          }
        })());
  }, `query(): TypeError for option input: ${JSON.stringify(test)}`);
}
