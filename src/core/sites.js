// userscript 的 @match 列表，同时作为运行时「当前页面是否受支持」的唯一真源：
// 构建时 vite.config.js 直接引用它，运行期各 handler 用 isSupportedUrl() 判断，
// 新增站点只改这一处，不会出现元数据和代码各写一份、互相漏改的情况。
export const MATCH_PATTERNS = [
    'https://greasyfork.org/*',
    'https://sleazyfork.org/*',
    'https://*.pornhub.com/*',
    'https://musedam.cc/*',
    'https://nsfw.xxx/*',
    'https://rule34.xxx/*',
    'https://anacams.com/post/*',
    'https://www.tekjam.com/album/*',
    'https://*.elitebabes.com/*',
    'https://*.hotnakedwomen.com/*',
    'https://*.hdpornpictures.com/*',
    'https://*.pornpics.com/*',
    'https://*.babehub.com/*',
];

// @match 语法：* 匹配任意字符；`*.` 前缀表示域名及其子域；其余字符按字面量处理。
function patternToRegExp(pattern) {
    const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    return new RegExp(
        `^${escaped.replace(/\*\\\./g, '(?:[^/]+\\.)?').replace(/\*/g, '.*')}$`,
    );
}

const PATTERN_REGEXPS = MATCH_PATTERNS.map(patternToRegExp);

export function isSupportedUrl(url = window.location.href) {
    return PATTERN_REGEXPS.some(re => re.test(url));
}
