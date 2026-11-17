// SPDX-License-Identifier: GPL-3.0-or-later
// Draws every <pre class="mermaid"> of the page with Mermaid. A chart
// that Mermaid cannot read stays as its text, with what Mermaid said
// about it underneath - the page is never left with nothing.
(function () {
  'use strict';

  // a page with a dark background gets Mermaid's dark colours
  function dark() {
    var m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(
      getComputedStyle(document.body).backgroundColor || '');
    if (!m || /rgba\(\s*0,\s*0,\s*0,\s*0\s*\)/.test(
      getComputedStyle(document.body).backgroundColor)) {
      return false;
    }
    return (0.2126 * m[1] + 0.7152 * m[2] + 0.0722 * m[3]) < 128;
  }

  async function draw() {
    if (!window.mermaid) {
      return;
    }
    // strict: what is written in a chart is text - no HTML, no scripts,
    // no links that run anything
    window.mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'strict',
      theme: dark() ? 'dark' : 'default',
      // labels are drawn as text, not as HTML: a tag written in a chart
      // is shown as it was written and makes nothing happen (only <br>
      // breaks a line)
      htmlLabels: false,
      // ... and a label on a line gets a solid patch behind it, so that
      // the line does not run through the words
      themeCSS: '.edgeLabel rect, .edgeLabel .background, .labelBkg ' +
        '{ opacity: 1 !important; fill-opacity: 1 !important; }',
      // a box takes a sentence before its text is broken: Mermaid's own
      // 200 pixels make tall, narrow boxes of wiki-sized labels
      flowchart: { htmlLabels: false, wrappingWidth: 460 }
    });
    var blocks = document.querySelectorAll('pre.mermaid');
    for (var i = 0; i < blocks.length; i++) {
      var block = blocks[i];
      var text = block.textContent;
      try {
        var out = await window.mermaid.render('tracmermaid-' + i, text);
        var chart = document.createElement('div');
        chart.className = 'tracmermaid';
        chart.style.maxWidth = '100%';
        chart.style.overflowX = 'auto';
        chart.innerHTML = out.svg;
        block.replaceWith(chart);
      } catch (error) {
        var note = document.createElement('p');
        note.className = 'tracmermaid-error';
        note.style.color = '#b00020';
        note.textContent = 'This chart could not be drawn: ' +
          String(error && error.message ? error.message : error).split('\n')[0];
        block.after(note);
        // Mermaid leaves its own error picture behind: take it away
        var left = document.getElementById('dtracmermaid-' + i);
        if (left) {
          left.remove();
        }
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', draw);
  } else {
    draw();
  }
})();
