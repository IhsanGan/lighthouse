/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const path = require('path');
const log = require('lighthouse-logger');
const MessageFormat = require('intl-messageformat').default;
const lookupClosestLocale = require('lookup-closest-locale');
const LOCALES = require('./locales.js');
const {isObjectOfUnknownValues, isObjectOrArrayOfUnknownValues} = require('../type-verifiers.js');

/** @typedef {import('intl-messageformat-parser').Element} MessageElement */
/** @typedef {import('intl-messageformat-parser').ArgumentElement} ArgumentElement */

const LH_ROOT = path.join(__dirname, '../../../');

const _ICUMsgNotFoundMsg = 'ICU message not found in destination locale';

(() => {
  // Node without full-icu doesn't come with the locales we want built-in. Load the polyfill if needed.
  // See https://nodejs.org/api/intl.html#intl_options_for_building_node_js

  // Conditionally polyfills itself. Bundler removes this dep, so this will be a no-op in browsers.
  // @ts-ignore
  require('intl-pluralrules');

  // @ts-ignore
  const IntlPolyfill = require('intl');

  // The bundler also removes this dep, so there's nothing to do if it's empty.
  if (!IntlPolyfill.NumberFormat) return;

  // Check if global implementation supports a minimum set of locales.
  const minimumLocales = ['en', 'es', 'ru', 'zh'];
  const supportedLocales = Intl.NumberFormat.supportedLocalesOf(minimumLocales);

  if (supportedLocales.length !== minimumLocales.length) {
    Intl.NumberFormat = IntlPolyfill.NumberFormat;
    Intl.DateTimeFormat = IntlPolyfill.DateTimeFormat;
  }
})();


const UIStrings = {
  /** Used to show the duration in milliseconds that something lasted. The `{timeInMs}` placeholder will be replaced with the time duration, shown in milliseconds (e.g. 63 ms) */
  ms: '{timeInMs, number, milliseconds}\xa0ms',
  /** Used to show the duration in seconds that something lasted. The {timeInMs} placeholder will be replaced with the time duration, shown in seconds (e.g. 5.2 s) */
  seconds: '{timeInMs, number, seconds}\xa0s',
  /** Label shown per-audit to show how many bytes smaller the page could be if the user implemented the suggestions. The `{wastedBytes}` placeholder will be replaced with the number of bytes, shown in kilobytes (e.g. 148 KB) */
  displayValueByteSavings: 'Potential savings of {wastedBytes, number, bytes}\xa0KB',
  /** Label shown per-audit to show how many milliseconds faster the page load could be if the user implemented the suggestions. The `{wastedMs}` placeholder will be replaced with the time duration, shown in milliseconds (e.g. 140 ms) */
  displayValueMsSavings: 'Potential savings of {wastedMs, number, milliseconds}\xa0ms',
  /** Label for a column in a data table; entries will be the URL of a web resource */
  columnURL: 'URL',
  /** Label for a column in a data table; entries will be the size or quantity of some resource, e.g. the width and height dimensions of an image or the number of images in a web page. */
  columnSize: 'Size',
  /** Label for a column in a data table; entries will be the file size of a web resource in kilobytes. */
  columnResourceSize: 'Resource Size',
  /** Label for a column in a data table; entries will be the download size of a web resource in kilobytes. */
  columnTransferSize: 'Transfer Size',
  /** Label for a column in a data table; entries will be the time to live value of the cache header on a web resource. */
  columnCacheTTL: 'Cache TTL',
  /** Label for a column in a data table; entries will be the number of kilobytes the user could reduce their page by if they implemented the suggestions. */
  columnWastedBytes: 'Potential Savings',
  /** Label for a column in a data table; entries will be the number of milliseconds the user could reduce page load by if they implemented the suggestions. */
  columnWastedMs: 'Potential Savings',
  /** Label for a column in a data table; entries will be the number of milliseconds spent during a particular activity. */
  columnTimeSpent: 'Time Spent',
  /** Label for a column in a data table; entries will be the location of a specific line of code in a file, in the format "line: 102". */
  columnLocation: 'Location',
  /** Label for a column in a data table; entries will be types of resources loaded over the network, e.g. "Scripts", "Third-Party", "Stylesheet". */
  columnResourceType: 'Resource Type',
  /** Label for a column in a data table; entries will be the number of network requests done by a webpage. */
  columnRequests: 'Requests',
  /** Label for a column in a data table; entries will be the names of arbitrary objects, e.g. the name of a Javascript library, or the name of a user defined timing event. */
  columnName: 'Name',
  /** Label for a column in a data table; entries will be the names of JavaScript code, e.g. the name of a Javascript package or module. */
  columnSource: 'Source',
  /** Label for a column in a data table; entries will be how much a predetermined budget has been exeeded by. Depending on the context, this number could represent an excess in quantity or size of network requests, or, an excess in the duration of time that it takes for the page to load.*/
  columnOverBudget: 'Over Budget',
  /** Label for a row in a data table; entries will be the total number and byte size of all resources loaded by a web page. */
  totalResourceType: 'Total',
  /** Label for a row in a data table; entries will be the total number and byte size of all 'Document' resources loaded by a web page. */
  documentResourceType: 'Document',
  /** Label for a row in a data table; entries will be the total number and byte size of all 'Script' resources loaded by a web page. 'Script' refers to JavaScript or other files that are executable by a browser. */
  scriptResourceType: 'Script',
  /** Label for a row in a data table; entries will be the total number and byte size of all 'Stylesheet' resources loaded by a web page. 'Stylesheet' refers to CSS stylesheets. */
  stylesheetResourceType: 'Stylesheet',
  /** Label for a row in a data table; entries will be the total number and byte size of all 'Image' resources loaded by a web page. */
  imageResourceType: 'Image',
  /** Label for a row in a data table; entries will be the total number and byte size of all 'Media' resources loaded by a web page. 'Media' refers to audio and video files. */
  mediaResourceType: 'Media',
  /** Label for a row in a data table; entries will be the total number and byte size of all 'Font' resources loaded by a web page. */
  fontResourceType: 'Font',
  /** Label for a row in a data table; entries will be the total number and byte size of all resources loaded by a web page that don't fit into the categories of Document, Script, Stylesheet, Image, Media, & Font.*/
  otherResourceType: 'Other',
  /** Label for a row in a data table; entries will be the total number and byte size of all third-party resources loaded by a web page. 'Third-party resources are items loaded from URLs that aren't controlled by the owner of the web page. */
  thirdPartyResourceType: 'Third-party',
  /** The name of the metric that marks the time at which the first text or image is painted by the browser. Shown to users as the label for the numeric metric value. Ideally fits within a ~40 character limit. */
  firstContentfulPaintMetric: 'First Contentful Paint',
  /** The name of the metric that marks when the page has displayed content and the CPU is not busy executing the page's scripts. Shown to users as the label for the numeric metric value. Ideally fits within a ~40 character limit. */
  firstCPUIdleMetric: 'First CPU Idle',
  /** The name of the metric that marks the time at which the page is fully loaded and is able to quickly respond to user input (clicks, taps, and keypresses feel responsive). Shown to users as the label for the numeric metric value. Ideally fits within a ~40 character limit. */
  interactiveMetric: 'Time to Interactive',
  /** The name of the metric that marks the time at which a majority of the content has been painted by the browser. Shown to users as the label for the numeric metric value. Ideally fits within a ~40 character limit. */
  firstMeaningfulPaintMetric: 'First Meaningful Paint',
  /** The name of the metric that marks the estimated time between the page receiving input (a user clicking, tapping, or typing) and the page responding. Shown to users as the label for the numeric metric value. Ideally fits within a ~40 character limit. */
  estimatedInputLatencyMetric: 'Estimated Input Latency',
  /** The name of a metric that calculates the total duration of blocking time for a web page. Blocking times are time periods when the page would be blocked (prevented) from responding to user input (clicks, taps, and keypresses will feel slow to respond). Shown to users as the label for the numeric metric value. Ideally fits within a ~40 character limit. */
  totalBlockingTimeMetric: 'Total Blocking Time',
  /** The name of the metric "Maximum Potential First Input Delay" that marks the maximum estimated time between the page receiving input (a user clicking, tapping, or typing) and the page responding. Shown to users as the label for the numeric metric value. Ideally fits within a ~40 character limit. */
  maxPotentialFIDMetric: 'Max Potential First Input Delay',
  /** The name of the metric that summarizes how quickly the page looked visually complete. The name of this metric is largely abstract and can be loosely translated. Shown to users as the label for the numeric metric value. Ideally fits within a ~40 character limit. */
  speedIndexMetric: 'Speed Index',
};

const formats = {
  number: {
    bytes: {
      maximumFractionDigits: 0,
    },
    milliseconds: {
      maximumFractionDigits: 0,
    },
    seconds: {
      // Force the seconds to the tenths place for limited output and ease of scanning
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    },
    extendedPercent: {
      // Force allow up to two digits after decimal place in percentages. (Intl.NumberFormat options)
      maximumFractionDigits: 2,
      style: 'percent',
    },
  },
};

/**
 * Look up the best available locale for the requested language through these fall backs:
 * - exact match
 * - progressively shorter prefixes (`de-CH-1996` -> `de-CH` -> `de`)
 * - the default locale ('en') if no match is found
 *
 * If `locale` isn't provided, the default is used.
 * @param {string=} locale
 * @return {LH.Locale}
 */
function lookupLocale(locale) {
  // TODO: could do more work to sniff out default locale
  const canonicalLocale = Intl.getCanonicalLocales(locale)[0];

  const closestLocale = lookupClosestLocale(canonicalLocale, LOCALES);
  return closestLocale || 'en';
}

/**
 * Function to retrieve all 'argumentElement's from an ICU message. An argumentElement
 * is an ICU element with an argument in it, like '{varName}' or '{varName, number, bytes}'. This
 * differs from 'messageElement's which are just arbitrary text in a message.
 *
 * Notes:
 *  This function will recursively inspect plural elements for nested argumentElements.
 *
 *  We need to find all the elements from the plural format sections, but
 *  they need to be deduplicated. I.e. "=1{hello {icu}} =other{hello {icu}}"
 *  the variable "icu" would appear twice if it wasn't de duplicated. And they cannot
 *  be stored in a set because they are not equal since their locations are different,
 *  thus they are stored via a Map keyed on the "id" which is the ICU varName.
 *
 * @param {Array<MessageElement>} icuElements
 * @param {Map<string, ArgumentElement>} [seenElementsById]
 * @return {Map<string, ArgumentElement>}
 */
function collectAllCustomElementsFromICU(icuElements, seenElementsById = new Map()) {
  for (const el of icuElements) {
    // We are only interested in elements that need ICU formatting (argumentElements)
    if (el.type !== 'argumentElement') continue;

    seenElementsById.set(el.id, el);

    // Plurals need to be inspected recursively
    if (!el.format || el.format.type !== 'pluralFormat') continue;
    // Look at all options of the plural (=1{} =other{}...)
    for (const option of el.format.options) {
      // Run collections on each option's elements
      collectAllCustomElementsFromICU(option.value.elements, seenElementsById);
    }
  }

  return seenElementsById;
}

/**
 * Returns a copy of the `values` object, with the values formatted based on how
 * they will be used in the `icuMessage`, e.g. KB or milliseconds. The original
 * object is unchanged.
 * @param {MessageFormat} messageFormatter
 * @param {Readonly<Record<string, string | number>>} values
 * @param {string} icuMessage Used for clear error logging.
 * @return {Record<string, string | number>}
 */
function _preformatValues(messageFormatter, values, icuMessage) {
  const elementMap = collectAllCustomElementsFromICU(messageFormatter.getAst().elements);
  const argumentElements = [...elementMap.values()];

  /** @type {Record<string, string | number>} */
  const formattedValues = {};

  for (const {id, format} of argumentElements) {
    // Throw an error if a message's value isn't provided
    if (id && (id in values) === false) {
      throw new Error(`ICU Message "${icuMessage}" contains a value reference ("${id}") ` +
        `that wasn't provided`);
    }

    const value = values[id];

    // Direct `{id}` replacement and non-numeric values need no formatting.
    if (!format || format.type !== 'numberFormat') {
      formattedValues[id] = value;
      continue;
    }

    if (typeof value !== 'number') {
      throw new Error(`ICU Message "${icuMessage}" contains a numeric reference ("${id}") ` +
        'but provided value was not a number');
    }

    // Format values for known styles.
    if (format.style === 'milliseconds') {
      // Round all milliseconds to the nearest 10.
      formattedValues[id] = Math.round(value / 10) * 10;
    } else if (format.style === 'seconds' && id === 'timeInMs') {
      // Convert all seconds to the correct unit (currently only for `timeInMs`).
      formattedValues[id] = Math.round(value / 100) / 10;
    } else if (format.style === 'bytes') {
      // Replace all the bytes with KB.
      formattedValues[id] = value / 1024;
    } else {
      // For all other number styles, the value isn't changed.
      formattedValues[id] = value;
    }
  }

  // Throw an error if a value is provided but has no placeholder in the message.
  for (const valueId of Object.keys(values)) {
    if (valueId in formattedValues) continue;

    // errorCode is a special case always allowed to help LHError ease-of-use.
    if (valueId === 'errorCode') {
      formattedValues.errorCode = values.errorCode;
      continue;
    }

    throw new Error(`Provided value "${valueId}" does not match any placeholder in ` +
      `ICU message "${icuMessage}"`);
  }

  return formattedValues;
}

/**
 *
 * @param {LH.Locale} locale
 * @param {LH.IcuMessage} icuMessage
 * @return {string}
 */
function _formatIcuMessage(locale, icuMessage) {
  const localeMessages = LOCALES[locale];
  if (!localeMessages) throw new Error(`Unsupported locale '${locale}'`);
  let localeMessage = localeMessages[icuMessage.id] && localeMessages[icuMessage.id].message;

  // fallback to the original english message if we couldn't find a message in the specified locale
  // better to have an english message than no message at all, in some number cases it won't even matter
  if (!localeMessage && icuMessage.uiStringMessage) {
    // Try to use the original uiStringMessage
    localeMessage = icuMessage.uiStringMessage;

    // Warn the user that the UIString message != the `en` message ∴ they should update the strings
    if (!LOCALES.en[icuMessage.id] || localeMessage !== LOCALES.en[icuMessage.id].message) {
      log.verbose('i18n', `Message "${icuMessage.id}" does not match its 'en' counterpart. ` +
        `Run 'i18n' to update.`);
    }
  }
  // At this point, there is no reasonable string to show to the user, so throw.
  if (!localeMessage) {
    throw new Error(_ICUMsgNotFoundMsg);
  }

  // when using accented english, force the use of a different locale for number formatting
  const localeForMessageFormat = (locale === 'en-XA' || locale === 'en-XL') ? 'de-DE' : locale;

  const formatter = new MessageFormat(localeMessage, localeForMessageFormat, formats);

  // preformat values for the message format like KB and milliseconds
  const {values = {}} = icuMessage;
  const valuesForMessageFormat = _preformatValues(formatter, values, localeMessage);

  const formattedString = formatter.format(valuesForMessageFormat);
  return formattedString;
}

/** @param {string[]} pathInLHR */
function _formatPathAsString(pathInLHR) {
  let pathAsString = '';
  for (const property of pathInLHR) {
    if (/^[a-z]+$/i.test(property)) {
      if (pathAsString.length) pathAsString += '.';
      pathAsString += property;
    } else {
      if (/]|"|'|\s/.test(property)) throw new Error(`Cannot handle "${property}" in i18n`);
      pathAsString += `[${property}]`;
    }
  }

  return pathAsString;
}

/**
 * @param {LH.Locale} locale
 * @return {LH.I18NRendererStrings}
 */
function getRendererFormattedStrings(locale) {
  const localeMessages = LOCALES[locale];
  if (!localeMessages) throw new Error(`Unsupported locale '${locale}'`);

  const icuMessageIds = Object.keys(localeMessages).filter(f => f.includes('core/report/html/'));
  const strings = /** @type {LH.I18NRendererStrings} */ ({});
  for (const icuMessageId of icuMessageIds) {
    const [filename, varName] = icuMessageId.split(' | ');
    if (!filename.endsWith('util.js')) throw new Error(`Unexpected message: ${icuMessageId}`);

    const key = /** @type {keyof LH.I18NRendererStrings} */ (varName);
    strings[key] = localeMessages[icuMessageId].message;
  }

  return strings;
}

/**
 * Register a file's UIStrings with i18n, return function to
 * generate the string ids.
 *
 * @param {string} filename
 * @param {Record<string, string>} fileStrings
 */
function createMessageInstanceIdFn(filename, fileStrings) {
  /** @type {Record<string, string>} */
  const mergedStrings = {...UIStrings, ...fileStrings};

  /**
   * Convert a message string and replacement values into an `LH.IcuMessage`.
   *
   * @param {string} icuMessage
   * @param {Record<string, string | number>} [values]
   * @return {LH.IcuMessage}
   */
  const getMessageInstanceIdFn = (icuMessage, values) => {
    const keyname = Object.keys(mergedStrings).find(key => mergedStrings[key] === icuMessage);
    if (!keyname) throw new Error(`Could not locate: ${icuMessage}`);

    const filenameToLookup = keyname in fileStrings ? filename : __filename;
    const unixStyleFilename = path.relative(LH_ROOT, filenameToLookup).replace(/\\/g, '/');
    const icuMessageId = `${unixStyleFilename} | ${keyname}`;

    return {
      id: icuMessageId,
      values,
      uiStringMessage: icuMessage,
    };
  };

  return getMessageInstanceIdFn;
}

/**
 * Returns whether `icuMessageOrNot`` is an `IcuMessage` instance.
 * @param {unknown} icuMessageOrNot
 * @return {icuMessageOrNot is LH.IcuMessage}
 */
function isIcuMessage(icuMessageOrNot) {
  if (!isObjectOfUnknownValues(icuMessageOrNot)) {
    return false;
  }

  const {id, values, uiStringMessage} = icuMessageOrNot;
  if (typeof id !== 'string') {
    return false;
  }

  // Values is optional.
  if (values !== undefined) {
    if (!isObjectOfUnknownValues(values)) {
      return false;
    }
    for (const value of Object.values(values)) {
      if (typeof value !== 'string' && typeof value !== 'number') {
        return false;
      }
    }
  }

  // uiStringMessage is optional.
  if (typeof uiStringMessage !== 'string' && uiStringMessage !== undefined) {
    return false;
  }

  // Finally return true if string is found in the default locale.
  // TODO(bckenny): faster to do element access? regex id first?
  return id in LOCALES.en;
}

/**
 * TODO(bckenny): do we need to accept raw string here?
 * @param {LH.IcuMessage | string} icuMessageOrRawString
 * @param {LH.Locale} locale
 * @return {string}
 */
function getFormatted(icuMessageOrRawString, locale) {
  if (isIcuMessage(icuMessageOrRawString)) {
    return _formatIcuMessage(locale, icuMessageOrRawString);
  }

  if (typeof icuMessageOrRawString === 'string') {
    return icuMessageOrRawString;
  }

  // TODO(bckenny): maybe not necesary if all callers are type checked.
  throw new Error('Invalid type passed in');
}

/**
 * Recursively walk the input object, looking for property values that are
 * string references and replace them with their localized values. Primarily
 * used with the full LHR or a Config as input.
 * Returns a map of locations that were replaced to the `IcuMessage` that was at
 * that location.
 * @param {unknown} inputObject
 * @param {LH.Locale} locale
 * @return {LH.IcuMessagesByPath}
 */
function replaceIcuMessageInstanceIds(inputObject, locale) {
  /**
   * @param {unknown} subObject
   * @param {LH.IcuMessagesByPath} icuMessagePaths
   * @param {string[]} pathInLHR
   */
  function replaceInObject(subObject, icuMessagePaths, pathInLHR = []) {
    if (!isObjectOrArrayOfUnknownValues(subObject)) return;

    for (const [property, possibleIcuMessage] of Object.entries(subObject)) {
      const currentPathInLHR = pathInLHR.concat([property]);

      // Check to see if the value in the LHR looks like an icuMessage. If it is, replace it.
      if (isIcuMessage(possibleIcuMessage)) {
        const formattedString = _formatIcuMessage(locale, possibleIcuMessage);
        const currentPathAsString = _formatPathAsString(currentPathInLHR);

        // @ts-ignore - tsc doesn't like that `property` can be either string or an array index.
        subObject[property] = formattedString;
        // Since the formattedString is now in the LHR, no need for uiStringMessage.
        icuMessagePaths[currentPathAsString] = {
          id: possibleIcuMessage.id,
          values: possibleIcuMessage.values,
        };
      } else {
        replaceInObject(possibleIcuMessage, icuMessagePaths, currentPathInLHR);
      }
    }
  }

  /** @type {LH.IcuMessagesByPath} */
  const icuMessagePaths = {};
  replaceInObject(inputObject, icuMessagePaths);
  return icuMessagePaths;
}

/** @typedef {import('./locales').LhlMessages} LhlMessages */

/**
 * Populate the i18n string lookup dict with locale data
 * Used when the host environment selects the locale and serves lighthouse the intended locale file
 * @see https://docs.google.com/document/d/1jnt3BqKB-4q3AE94UWFA0Gqspx8Sd_jivlB7gQMlmfk/edit
 * @param {LH.Locale} locale
 * @param {LhlMessages} lhlMessages
 */
function registerLocaleData(locale, lhlMessages) {
  LOCALES[locale] = lhlMessages;
}

module.exports = {
  _formatPathAsString,
  _ICUMsgNotFoundMsg,
  UIStrings,
  lookupLocale,
  getRendererFormattedStrings,
  createMessageInstanceIdFn,
  getFormatted,
  replaceIcuMessageInstanceIds,
  isIcuMessage,
  collectAllCustomElementsFromICU,
  registerLocaleData,
};
