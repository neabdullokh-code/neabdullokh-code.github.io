/* abdullokh.cpp — everything that makes the page feel like an IDE:
   line numbers and cursor, a code fold, the mood switch (theme + rain + flowers)
   and a small terminal. The C++ on the page is real: with the two headers it
   includes, `clang++ -std=c++17 -Wall` prints exactly what ▶ Run shows. */
(() => {
    'use strict';

    const root = document.documentElement;
    const $ = (sel, el = document) => el.querySelector(sel);
    const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const finePointer = window.matchMedia('(pointer: fine)');
    const wait = ms => new Promise(resolve => setTimeout(resolve, reduceMotion.matches ? 0 : ms));
    const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const own = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);
    const smooth = () => (reduceMotion.matches ? 'auto' : 'smooth');

    const store = {
        get(key) { try { return localStorage.getItem(key); } catch (e) { return null; } },
        set(key, value) { try { localStorage.setItem(key, value); } catch (e) { /* private mode */ } },
    };

    const code = $('#code');

    /* ---------- Text helpers ---------- */

    // The text a line shows, as it would be in the .cpp file
    // (no screen-reader names, tooltips, gutter icons or hidden fold parts).
    function visibleText(node) {
        const copy = node.cloneNode(true);
        $$('.sr, .tip, .gi, .star, .hint, [hidden]', copy).forEach(el => el.remove());
        return copy.textContent;
    }

    // What a person would read out loud: drops decorative code tokens.
    function plainText(node) {
        const copy = node.cloneNode(true);
        $$('[aria-hidden="true"], .tip', copy).forEach(el => el.remove());
        return copy.textContent.replace(/\s+/g, ' ').trim();
    }

    const indentOf = line => Number(getComputedStyle(line).getPropertyValue('--i')) || 0;
    const lineOf = target => (target.classList.contains('l') ? target : $('.l', target));

    // Column of the squiggly word if the line has one, otherwise the first character.
    function columnOf(line) {
        const word = $('.squiggle', line);
        if (!word) return indentOf(line) * 4 + 1;
        const range = document.createRange();
        range.setStart(line, 0);
        range.setEndBefore(word);
        const before = document.createElement('div');
        before.append(range.cloneContents());
        return indentOf(line) * 4 + visibleText(before).length + 1;
    }

    /* ---------- Line numbers ---------- */

    // Mirrors the CSS counter: every .l is one line, a closed fold adds its hidden lines.
    function renumber() {
        let n = 0;
        for (const el of $$('.l, .fold-gap', code)) {
            if (el.classList.contains('fold-gap')) {
                if (!el.hidden) n += Number(el.dataset.lines) || 0;
            } else {
                el.dataset.n = ++n;
            }
        }
        $$('[data-line-of]').forEach(el => {
            const target = document.getElementById(el.dataset.lineOf);
            if (target) el.textContent = `:${target.dataset.n}:${columnOf(target)}`;
        });
    }

    /* ---------- Cursor: click a line, see Ln/Col in the status bar ---------- */

    const cursorPos = $('#cursorPos');
    let current = null;

    function setCursor(line, col = 1) {
        if (current) current.classList.remove('is-cur');
        current = line;
        line.classList.add('is-cur');
        cursorPos.textContent = `Ln ${line.dataset.n}, Col ${col}`;
    }

    function columnAt(line, x, y) {
        let node = null;
        let offset = 0;
        if (document.caretPositionFromPoint) {
            const pos = document.caretPositionFromPoint(x, y);
            if (pos) { node = pos.offsetNode; offset = pos.offset; }
        } else if (document.caretRangeFromPoint) {
            const range = document.caretRangeFromPoint(x, y);
            if (range) { node = range.startContainer; offset = range.startOffset; }
        }
        if (!node || !line.contains(node)) return indentOf(line) * 4 + 1;
        const range = document.createRange();
        range.setStart(line, 0);
        range.setEnd(node, offset);
        const before = document.createElement('div');
        before.append(range.cloneContents());
        return indentOf(line) * 4 + visibleText(before).length + 1;
    }

    code.addEventListener('click', e => {
        const line = e.target.closest('.l');
        if (line) setCursor(line, columnAt(line, e.clientX, e.clientY));
    });

    function goTo(target) {
        const line = lineOf(target);
        if (!line) return;
        line.scrollIntoView({ block: 'center', behavior: smooth() });
        setCursor(line, columnOf(line));
        line.classList.remove('flash');
        void line.offsetWidth; // restart the animation
        line.classList.add('flash');
    }

    // One listener for every "jump to line" link, including the ones the terminal prints later.
    document.addEventListener('click', e => {
        const link = e.target.closest('[data-goto]');
        if (!link) return;
        const target = document.getElementById(link.dataset.goto);
        if (target) goTo(target);
    });

    // Explorer: opening a picture shows where the code uses it.
    $$('[data-reveal]').forEach(btn => btn.addEventListener('click', () => {
        const card = $(`[data-pick="${btn.dataset.reveal}"]`);
        if (!card) return;
        card.scrollIntoView({ block: 'center', behavior: smooth() });
        card.classList.remove('flash');
        void card.offsetWidth;
        card.classList.add('flash');
    }));

    /* ---------- Outline + breadcrumbs follow the scroll ---------- */

    const outlineLinks = $$('.outline a');
    const crumbs = $('#breadcrumbs');
    const spots = outlineLinks
        .map(link => ({ link, target: $(link.getAttribute('href')) }))
        .filter(spot => spot.target);

    function updateOutline() {
        const limit = window.innerHeight * 0.45;
        let active = null;
        for (const spot of spots) {
            if (spot.target.getBoundingClientRect().top <= limit) active = spot;
        }
        outlineLinks.forEach(link => link.classList.toggle('is-active', active !== null && link === active.link));
        crumbs.textContent = active ? active.link.dataset.crumb : 'abdullokh.cpp';
    }

    let outlineQueued = false;
    const queueOutline = () => {
        if (outlineQueued) return;
        outlineQueued = true;
        requestAnimationFrame(() => { outlineQueued = false; updateOutline(); });
    };
    code.addEventListener('scroll', queueOutline, { passive: true });
    window.addEventListener('scroll', queueOutline, { passive: true });
    window.addEventListener('resize', queueOutline);

    outlineLinks.forEach(link => link.addEventListener('click', () => {
        const target = $(link.getAttribute('href'));
        const line = target && lineOf(target);
        if (line) setCursor(line, indentOf(line) * 4 + 1);
    }));

    /* ---------- Page content (the program prints it, the fold is built from it) ---------- */

    const page = {
        title: () => plainText($('.doc-title')),
        intro: () => plainText($('.doc-intro')),
        section: id => plainText($(`#${id} .sec-title`)),
        classes: () => $$('#classes li').map(plainText),
        movies: () => $$('#movies li a').map(a => ({ title: plainText(a), href: a.href })),
        neighbors: () => plainText($('#neighbors .fact')),
    };

    /* ---------- The fold: introduce() is real C++ ---------- */

    const span = (cls, text) => `<span class="${cls}">${esc(text)}</span>`;
    const cppString = text => '"' + text.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n') + '"';
    const str = text => span('s', cppString(text));
    const chr = text => span('s', `'${text}'`);
    const num = text => span('n', text);
    const kw = text => span('k', text);
    const ty = text => span('t', text);

    // The body of introduce(), line by line: [indent, html]. Built from the page,
    // so it always prints exactly what the page says.
    function introduceBody() {
        const cout = `${ty('std')}::cout`;
        const more = ' '.repeat(10); // continuation lines line up under the first <<
        const names = page.classes().map(str).join(', ');
        return [
            [2, `${cout} &lt;&lt; ${str(page.title() + '\n')}`],
            [2, `${more}&lt;&lt; ${str('I love ')} &lt;&lt; passion &lt;&lt; ${str('.\n\n')}`],
            [2, `${more}&lt;&lt; ${str(page.section('classes') + ':\n')};`],
            [2, `${kw('for')} (${kw('const char')}* name : {${names}})`],
            [3, `${cout} &lt;&lt; ${str('  • ')} &lt;&lt; name &lt;&lt; ${chr('\\n')};`],
            [2, `${cout} &lt;&lt; ${str('\n' + page.section('movies') + ':\n')};`],
            [2, `${kw('for')} (${ty('std')}::${ty('size_t')} i = ${num('0')}; i &lt; ${ty('std')}::${span('f', 'size')}(favoriteMovies); ++i)`],
            [3, `${cout} &lt;&lt; ${str('  ')} &lt;&lt; i + ${num('1')} &lt;&lt; ${str('. ')} &lt;&lt; favoriteMovies[i] &lt;&lt; ${chr('\\n')};`],
            [2, `${cout} &lt;&lt; ${str('\n' + page.section('moods') + ': ')} &lt;&lt; (mood == ${ty('Mood')}::${span('e', 'HAPPY')} ? ${str('HAPPY :)')} : ${str('SAD :(')}) &lt;&lt; ${str('\n\n')}`],
            [2, `${more}&lt;&lt; ${str(page.section('neighbors') + ':\n')}`],
            [2, `${more}&lt;&lt; ${str('  ' + page.neighbors() + '\n')};`],
            [1, '}'],
        ];
    }

    const foldLine = $('#introduce');
    const foldGap = $('.fold-gap');
    const foldButtons = $$('[data-fold]');

    // Keep the "hidden lines" count honest even if the body above changes.
    const hiddenLines = introduceBody().length;
    foldGap.dataset.lines = hiddenLines;
    foldGap.style.counterIncrement = `line ${hiddenLines}`;

    function setFold(open) {
        $$('.fold-body', code).forEach(el => el.remove());
        if (open) {
            foldLine.after(...introduceBody().map(([indent, html]) => {
                const row = document.createElement('div');
                row.className = 'l fold-body';
                row.style.setProperty('--i', indent);
                row.innerHTML = html;
                return row;
            }));
        }
        foldGap.hidden = open;
        $$('.fold-pill, .fold-close', foldLine).forEach(el => { el.hidden = open; });
        foldLine.classList.toggle('is-open', open);
        foldButtons.forEach(btn => {
            btn.setAttribute('aria-expanded', String(open));
            if (btn.classList.contains('gi-fold')) {
                btn.setAttribute('aria-label', open ? 'Fold introduce()' : 'Unfold introduce()');
                btn.title = open ? 'Fold' : 'Unfold';
            }
        });
        renumber();
    }

    foldButtons.forEach(btn => btn.addEventListener('click', () => {
        setFold(!foldLine.classList.contains('is-open'));
    }));

    renumber();
    updateOutline();

    /* ---------- Rain (sad mode only) ---------- */

    const rain = (() => {
        const canvas = $('#rain');
        const ctx = canvas.getContext('2d');
        let drops = [];
        let width = 0;
        let height = 0;
        let raining = false;
        let frame = 0;
        let last = 0;
        let stopAt = 0;

        const drop = anywhere => ({
            x: Math.random() * (width + 80),
            y: anywhere ? Math.random() * height : -30 - Math.random() * height * 0.3,
            len: 10 + Math.random() * 18,
            speed: 0.5 + Math.random() * 0.6,
            alpha: 0.1 + Math.random() * 0.25,
        });

        function resize() {
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            width = window.innerWidth;
            height = window.innerHeight;
            canvas.width = width * dpr;
            canvas.height = height * dpr;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            drops = Array.from({ length: Math.round((width * height) / 8000) }, () => drop(true));
        }

        function draw(t) {
            const dt = Math.min(48, t - (last || t));
            last = t;
            ctx.clearRect(0, 0, width, height);
            ctx.lineWidth = 1;
            ctx.lineCap = 'round';
            for (const d of drops) {
                d.y += d.speed * dt;
                d.x -= d.speed * dt * 0.12;
                if (d.y - d.len > height) Object.assign(d, drop(false));
                ctx.strokeStyle = `rgba(190, 205, 215, ${d.alpha})`;
                ctx.beginPath();
                ctx.moveTo(d.x, d.y);
                ctx.lineTo(d.x + d.len * 0.12, d.y - d.len);
                ctx.stroke();
            }
            if (raining || t < stopAt) {
                frame = requestAnimationFrame(draw);
            } else {
                ctx.clearRect(0, 0, width, height);
                frame = 0;
            }
        }

        window.addEventListener('resize', () => { if (frame) resize(); });

        return {
            toggle(on) {
                raining = on && !reduceMotion.matches;
                if (raining && !frame) {
                    resize();
                    last = 0;
                    frame = requestAnimationFrame(draw);
                } else if (!raining) {
                    stopAt = performance.now() + 1500; // let it fade out with the canvas
                }
            },
        };
    })();

    /* ---------- Flowers (switching back to happy) ---------- */

    const FLOWER = '<svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true"><g fill="#f2b705">'
        + [0, 72, 144, 216, 288].map(a => `<ellipse cx="10" cy="5" rx="3" ry="4.6" transform="rotate(${a} 10 10)"/>`).join('')
        + '</g><circle cx="10" cy="10" r="2.6" fill="#7a4a00"/></svg>';

    function bloom(from) {
        if (reduceMotion.matches || !from) return;
        const box = from.getBoundingClientRect();
        const cx = box.left + box.width / 2;
        const cy = box.top + box.height / 2;
        for (let i = 0; i < 16; i++) {
            const petal = document.createElement('span');
            petal.className = 'petal';
            petal.innerHTML = FLOWER;
            petal.style.left = cx + 'px';
            petal.style.top = cy + 'px';
            document.body.append(petal);
            const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.6;
            const dist = 70 + Math.random() * 120;
            const dx = Math.cos(angle) * dist;
            const dy = Math.sin(angle) * dist;
            const spin = (Math.random() - 0.5) * 540;
            const scale = 0.55 + Math.random() * 0.7;
            petal.animate([
                { transform: 'translate(0, 0) scale(0) rotate(0deg)', opacity: 1 },
                { transform: `translate(${dx}px, ${dy}px) scale(${scale}) rotate(${spin / 2}deg)`, opacity: 1, offset: 0.5 },
                { transform: `translate(${dx * 1.2}px, ${dy + 90}px) scale(${scale}) rotate(${spin}deg)`, opacity: 0 },
            ], {
                duration: 1200 + Math.random() * 600,
                easing: 'cubic-bezier(.2, .7, .3, 1)',
            }).onfinish = () => petal.remove();
        }
    }

    /* ---------- Mood ---------- */

    const MOODS = ['happy', 'sad'];
    const favicon = $('#favicon');
    const themeColor = $('meta[name="theme-color"]');
    const moodValue = $('#moodValue');

    function faviconFor(mood) {
        const [bg, fg, face] = mood === 'happy' ? ['#f2b705', '#2f2a20', ':)'] : ['#1b1b1d', '#9db4c0', ':('];
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="${bg}"/>`
            + `<text x="32" y="43" text-anchor="middle" font-family="Menlo,Consolas,monospace" font-size="30" font-weight="700" fill="${fg}" transform="rotate(90 32 32)">${face}</text></svg>`;
        return 'data:image/svg+xml,' + encodeURIComponent(svg);
    }

    let switchTimer = 0;

    function setMood(mood, from) {
        if (!MOODS.includes(mood)) return false;
        const changed = root.dataset.mood !== mood;
        if (changed) {
            root.classList.add('is-switching');
            clearTimeout(switchTimer);
            switchTimer = setTimeout(() => root.classList.remove('is-switching'), 900);
        }
        root.dataset.mood = mood;
        $$('[data-mood-text]').forEach(el => { el.textContent = mood.toUpperCase(); });
        moodValue.setAttribute('aria-label', `Change mood, currently ${mood}`);
        document.title = `Abdullokh Abdusamatov ${mood === 'happy' ? ':)' : ':('}`;
        favicon.href = faviconFor(mood);
        themeColor.content = mood === 'happy' ? '#efe6d1' : '#151516';
        rain.toggle(mood === 'sad');
        store.set('mood', mood);
        if (changed && mood === 'happy') bloom(from);
        return changed;
    }

    const toggleMood = from => {
        moodValue.classList.remove('nudge');
        setMood(root.dataset.mood === 'happy' ? 'sad' : 'happy', from);
    };

    moodValue.addEventListener('click', () => toggleMood(moodValue));
    $('#moodToggle').addEventListener('click', e => toggleMood(e.currentTarget));
    $('#sbMood').addEventListener('click', e => toggleMood(e.currentTarget));
    $$('[data-pick]').forEach(card => card.addEventListener('click', () => {
        moodValue.classList.remove('nudge');
        setMood(card.dataset.pick, card);
    }));

    setMood(MOODS.includes(root.dataset.mood) ? root.dataset.mood : 'happy');

    /* ---------- Neighbors tooltip: Escape hides it ---------- */

    $('.squiggle').addEventListener('keydown', e => {
        if (e.key === 'Escape') e.currentTarget.blur();
    });

    /* ---------- Tashkent clock ---------- */

    const clock = $('#clock');
    let tashkent = null;
    try {
        tashkent = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Tashkent', hour: '2-digit', minute: '2-digit' });
    } catch (e) { /* very old browser: leave the label as it is */ }
    const tick = () => { if (tashkent) clock.textContent = `Tashkent ${tashkent.format(new Date())}`; };
    tick();
    setInterval(tick, 15000);

    /* ---------- Panel: tabs + collapse ---------- */

    const panel = $('#panel');
    const panelMin = $('#panelMin');
    const tabs = { term: $('#tab-term'), problems: $('#tab-problems') };
    const panes = { term: $('#term'), problems: $('#problems') };

    function showPane(name) {
        Object.keys(tabs).forEach(key => {
            tabs[key].setAttribute('aria-selected', String(key === name));
            panes[key].hidden = key !== name;
        });
        setCollapsed(false);
    }

    function setCollapsed(collapsed) {
        panel.classList.toggle('is-min', collapsed);
        panelMin.setAttribute('aria-expanded', String(!collapsed));
        panelMin.setAttribute('aria-label', collapsed ? 'Expand panel' : 'Collapse panel');
    }

    tabs.term.addEventListener('click', () => showPane('term'));
    tabs.problems.addEventListener('click', () => showPane('problems'));
    $('.panel-tabs').addEventListener('keydown', e => {
        if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
        const next = e.target === tabs.term ? 'problems' : 'term';
        showPane(next);
        tabs[next].focus();
    });
    panelMin.addEventListener('click', () => setCollapsed(!panel.classList.contains('is-min')));

    /* ---------- Terminal ---------- */

    const term = $('#term');
    const out = $('#termOut');
    const form = $('#termForm');
    const input = $('#termInput');
    const runBtn = $('#runBtn');
    const PROMPT = 'abdullokh@iut:~$';
    const GITHUB = 'https://github.com/neabdullokh-code';
    const history = [];
    let historyAt = 0;
    let queue = Promise.resolve();
    let busy = 0;
    let built = null; // the mood the binary was compiled with; null = not compiled yet

    // Terminal jobs run one after another, never interleaved.
    function enqueue(job) {
        busy++;
        runBtn.setAttribute('aria-busy', 'true');
        out.setAttribute('aria-busy', 'true'); // screen readers wait for the whole output
        queue = queue.then(job).catch(err => {
            print(esc(String(err)), 'o-err');
        }).finally(() => {
            busy--;
            if (!busy) {
                runBtn.removeAttribute('aria-busy');
                out.removeAttribute('aria-busy');
            }
        });
        return queue;
    }

    function print(html = '', cls = '') {
        const row = document.createElement('div');
        row.className = 'o' + (cls ? ' ' + cls : '');
        row.innerHTML = html;
        out.append(row);
        term.scrollTop = term.scrollHeight;
        return row;
    }

    async function printAll(rows, gap = 30) {
        for (const row of rows) {
            if (Array.isArray(row)) print(row[0], row[1]);
            else print(row);
            await wait(gap);
        }
    }

    async function echo(cmd, typed) {
        const row = print(`<span class="o-prompt">${PROMPT}</span> `, 'o-cmd');
        const text = document.createElement('span');
        row.append(text);
        if (!typed || reduceMotion.matches) {
            text.textContent = cmd;
            return;
        }
        for (const ch of cmd) {
            text.textContent += ch;
            term.scrollTop = term.scrollHeight;
            await wait(16 + Math.random() * 28);
        }
        await wait(160);
    }

    const moodFace = (mood = root.dataset.mood) => (mood === 'happy' ? ':)' : ':(');
    const listClasses = () => page.classes().map(c => '  • ' + esc(c));
    const listMovies = () => page.movies().map((m, i) =>
        `  ${i + 1}. <a href="${esc(m.href)}" target="_blank" rel="noopener">${esc(m.title)}</a>`);

    // Exactly what clang 18 prints for this file (checked against the real compiler).
    async function compile() {
        const line = $('#neighborsLine');
        const n = line.dataset.n;
        const col = columnOf(line);
        const source = ' '.repeat(indentOf(line) * 4) + visibleText(line);
        await echo('clang++ -std=c++17 -Wall abdullokh.cpp -o abdullokh', true);
        await wait(450);
        await printAll([
            [`<button class="o-loc" type="button" data-goto="neighborsLine" title="Go to line ${n}">abdullokh.cpp:${n}:${col}</button>: <b>warning:</b> private field 'neighbors' is not used [-Wunused-private-field]`, 'o-warn'],
            [`${String(n).padStart(5)} | ${esc(source)}`, 'o-dim'],
            [`${' '.repeat(5)} | ${' '.repeat(col - 1)}<span class="o-warn">^</span>`, 'o-dim'],
            ['1 warning generated.', 'o-dim'],
        ], 60);
        built = root.dataset.mood;
    }

    // What ./abdullokh prints — the same text introduce() builds in the fold.
    // Like a real binary, it remembers the mood it was compiled with.
    function program(mood = built) {
        return printAll([
            [esc(page.title()), 'o-title'],
            esc(page.intro()),
            '',
            [esc(page.section('classes')) + ':', 'o-title'],
            ...listClasses(),
            '',
            [esc(page.section('movies')) + ':', 'o-title'],
            ...listMovies(),
            '',
            [`${esc(page.section('moods'))}: ${mood.toUpperCase()} ${moodFace(mood)}`, 'o-title'],
            '',
            [esc(page.section('neighbors')) + ':', 'o-title'],
            '  ' + esc(page.neighbors()),
        ], 45);
    }

    async function compileAndRun() {
        await compile();
        await echo('./abdullokh', true);
        await wait(250);
        await program();
    }

    async function ping(host) {
        if (host !== 'neighbors' && host !== 'neighbours') {
            print('usage: ping neighbors', 'o-dim');
            return;
        }
        print('PING neighbors: 56 data bytes');
        for (let i = 0; i < 4; i++) {
            await wait(650);
            print(`Request timeout for icmp_seq ${i}`, 'o-dim');
        }
        await wait(400);
        await printAll([
            '',
            '--- neighbors ping statistics ---',
            ['4 packets transmitted, 0 packets received, 100.0% packet loss', 'o-err'],
            ['# ' + esc(page.neighbors()), 'o-dim'],
        ], 40);
    }

    // The two headers abdullokh.cpp includes. With these, the file really compiles.
    const HEADERS = {
        'family/abdulaziz.hpp': ['#pragma once', '', 'class Abdulaziz {', "    // dad's members are private", '};'],
        'iut/quarter.hpp': ['#pragma once', '', 'struct English {};', 'struct Math {};', 'struct Science {};', 'struct ComputerScience {};'],
    };
    const FILES = ['README.md', 'abdullokh.cpp', 'family/abdulaziz.hpp', 'happy.jpg', 'iut/quarter.hpp', 'sad.jpg'];

    // `cat README.md` prints the real file when the page is served (GitHub Pages);
    // opened straight from disk, fetch() is blocked, so fall back to the first lines.
    const readme = () => fetch('README.md')
        .then(res => (res.ok ? res.text() : Promise.reject(res.status)))
        .catch(() => '# neabdullokh-code.github.io\nhttps://neabdullokh-code.github.io/')
        .then(text => text.trimEnd().split('\n'));

    const commands = {
        help: () => printAll([
            ['Commands:', 'o-dim'],
            '  <b>run</b>                compile &amp; run abdullokh.cpp',
            '  <b>./abdullokh</b>        run it again',
            '  <b>whoami</b>             who wrote this file',
            '  <b>classes</b>            this quarter at IUT',
            '  <b>movies</b>             favorite movies',
            '  <b>mood</b> [happy|sad]   get or change my mood',
            '  <b>ping neighbors</b>     look for neighbors',
            '  <b>ls</b>, <b>cat</b> &lt;file&gt;, <b>date</b>, <b>github</b>, <b>clear</b>, <b>exit</b>',
        ], 12),
        run: () => compileAndRun(),
        './abdullokh': async () => {
            if (!built) {
                print('bash: ./abdullokh: No such file or directory', 'o-err');
                print('# compile it first: run', 'o-dim');
                return;
            }
            await program();
            if (built !== root.dataset.mood) {
                print(`# this binary was built with Mood::${built.toUpperCase()}; type run to rebuild`, 'o-dim');
            }
        },
        whoami: () => printAll([
            ['abdullokh', 'o-title'],
            '  namespace   Abdusamatov      <span class="o-dim">(family name)</span>',
            '  base class  Abdulaziz        <span class="o-dim">(o‘g‘li — son of)</span>',
            '  school      IUT',
            '  loves       programming',
        ], 20),
        classes: () => printAll([[esc(page.section('classes')) + ':', 'o-title'], ...listClasses()], 20),
        movies: () => printAll([[esc(page.section('movies')) + ':', 'o-title'], ...listMovies()], 20),
        mood: (arg, ctx) => {
            if (!arg) {
                print(`mood = Mood::${root.dataset.mood.toUpperCase()};  <span class="o-dim">// ${moodFace()}</span>`);
                return;
            }
            const next = arg.toLowerCase();
            if (!MOODS.includes(next)) {
                print(`error: no member named '${esc(arg.toUpperCase())}' in 'Mood'`, 'o-err');
                print('note: available moods are HAPPY and SAD', 'o-dim');
                return;
            }
            if (!setMood(next, ctx.from)) {
                print(`mood is already ${next.toUpperCase()} ${moodFace()}`, 'o-dim');
                return;
            }
            print(next === 'sad'
                ? 'mood = Mood::SAD;    <span class="o-dim">// world.saturation = 0;</span>'
                : 'mood = Mood::HAPPY;  <span class="o-dim">// colors restored</span>');
        },
        ping: arg => ping((arg || '').toLowerCase()),
        ls: () => {
            const items = [
                ...(built ? ['<span class="o-exe">abdullokh</span>'] : []),
                'abdullokh.cpp',
                '<span class="o-dir">family</span>',
                'happy.jpg',
                '<span class="o-dir">iut</span>',
                'README.md',
                'sad.jpg',
            ];
            print(items.join('  '));
        },
        cat: arg => {
            const file = (arg || '').replace(/^\.\//, '');
            if (!file) return print('usage: cat &lt;file&gt;', 'o-dim');
            if (file === 'README.md') return readme().then(rows => printAll(rows.map(esc), 30));
            if (own(HEADERS, file)) return printAll(HEADERS[file].map(esc), 20);
            if (file === 'abdullokh.cpp') return print('it is right above you ↑', 'o-dim');
            if (file === 'family' || file === 'iut') return print(`cat: ${file}: Is a directory`, 'o-err');
            if (file === 'abdullokh' && built) return print('cat: abdullokh: binary file — try ./abdullokh', 'o-dim');
            if (file === 'happy.jpg' || file === 'sad.jpg') {
                return print(`cat: ${file}: binary file — try "mood ${file.slice(0, -4)}"`, 'o-dim');
            }
            return print(`cat: ${esc(file)}: No such file or directory`, 'o-err');
        },
        date: () => {
            const opts = { timeZone: 'Asia/Tashkent', dateStyle: 'full', timeStyle: 'short' };
            try { print(`${new Date().toLocaleString('en-GB', opts)} — Tashkent`); } catch (e) { print(new Date().toString()); }
        },
        github: () => print(`opening <a href="${GITHUB}" target="_blank" rel="noopener">${GITHUB}</a>`),
        sudo: async () => {
            print('[sudo] password for abdullokh: ');
            await wait(900);
            print('abdullokh is not in the sudoers file. This incident will be reported to Abdulaziz.', 'o-err');
        },
        clear: () => { out.innerHTML = ''; },
        exit: () => { print('logout', 'o-dim'); setCollapsed(true); },
    };

    const names = Object.keys(commands).filter(name => !name.startsWith('.'));

    function exec(raw, { typed = false, from = null } = {}) {
        const cmd = raw.trim();
        const [name = '', ...rest] = cmd.split(/\s+/);
        const key = own(commands, name) ? name : own(commands, name.toLowerCase()) ? name.toLowerCase() : null;
        // Open the new tab right away, while the click/Enter still counts as a user action.
        if (key === 'github') window.open(GITHUB, '_blank', 'noopener');
        return enqueue(async () => {
            await echo(cmd, typed);
            if (!cmd) return;
            if (key) await commands[key](rest.join(' '), { from });
            else print(`bash: ${esc(name)}: command not found — try <b>help</b>`, 'o-err');
        });
    }

    form.addEventListener('submit', e => {
        e.preventDefault();
        const cmd = input.value;
        input.value = '';
        if (cmd.trim()) history.push(cmd.trim());
        historyAt = history.length;
        exec(cmd, { from: input });
    });

    input.addEventListener('keydown', e => {
        if (e.key === 'ArrowUp' && historyAt > 0) {
            e.preventDefault();
            input.value = history[--historyAt];
        } else if (e.key === 'ArrowDown' && historyAt < history.length) {
            e.preventDefault();
            historyAt++;
            input.value = history[historyAt] || '';
        } else if (e.key === 'Tab') {
            const file = input.value.match(/^cat\s+(\S*)$/);
            const word = file ? file[1] : input.value.trim();
            if (!word || (!file && input.value.includes(' '))) return; // let Tab move focus
            const matches = (file ? FILES : names).filter(option => option.startsWith(word));
            if (matches.length === 1) {
                e.preventDefault();
                input.value = file ? `cat ${matches[0]}` : `${matches[0]} `;
            }
        } else if (e.ctrlKey && e.key.toLowerCase() === 'l') {
            e.preventDefault();
            commands.clear();
        }
    });

    // Clicking the terminal focuses the prompt. Not on touch screens: there a tap
    // to read the output should not pop up the keyboard.
    term.addEventListener('click', e => {
        if (!finePointer.matches || e.target.closest('a, button') || String(window.getSelection())) return;
        input.focus({ preventScroll: true });
    });

    function revealPanel() {
        showPane('term');
        const r = panel.getBoundingClientRect();
        if (r.top > window.innerHeight - 120 || r.bottom < 0) {
            panel.scrollIntoView({ block: 'start', behavior: smooth() });
        }
    }

    const run = () => {
        if (busy) return;
        revealPanel();
        enqueue(compileAndRun);
    };
    runBtn.addEventListener('click', run);
    $('#gutterRun').addEventListener('click', run);

    $$('[data-cmd]').forEach(btn => btn.addEventListener('click', () => {
        revealPanel();
        exec(btn.dataset.cmd, { typed: true, from: btn });
    }));

    printAll([
        ['Welcome to abdullokh.cpp, a personal page written in C++.', 'o-dim'],
        ['Press ▶ Run, change the mood in the code, or type <b>help</b>.', 'o-dim'],
    ], 0);
})();
