// SPDX-License-Identifier: GPL-3.0-or-later
// Draws every <pre class="mermaid"> of the page with Mermaid. Whatever
// goes wrong, the page is never left with nothing: a chart that cannot
// be drawn stays as its text, with a line underneath that says why.
(function () {
  'use strict';

  // The colour a reader sees behind el: the first background up the
  // tree that is not see-through. The browser paints it for us, so
  // every way of writing a colour is understood. null = nothing set.
  function backgroundOf(el) {
    var canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1;
    var paint = canvas.getContext('2d', { willReadFrequently: true });
    if (!paint) {
      return null;
    }
    for (var e = el; e; e = e.parentElement) {
      var colour = getComputedStyle(e).backgroundColor;
      if (!colour) {
        continue;
      }
      paint.clearRect(0, 0, 1, 1);
      paint.fillStyle = colour;
      paint.fillRect(0, 0, 1, 1);
      var dot = paint.getImageData(0, 0, 1, 1).data;
      if (dot[3] >= 128) {
        return dot;
      }
    }
    return null;
  }

  // a page with a dark background gets Mermaid's dark colours
  function dark(el) {
    var c = backgroundOf(el);
    return !!c && (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) < 128;
  }

  function say(block, text) {
    var note = document.createElement('p');
    note.className = 'tracmermaid-error';
    note.style.color = '#b00020';
    note.textContent = text;
    block.after(note);
  }

  function shown(el) {
    return el.getClientRects().length > 0;
  }

  async function drawOne(block, number) {
    try {
      var out = await window.mermaid.render('tracmermaid-' + number,
                                            block.textContent);
      var chart = document.createElement('div');
      chart.className = 'tracmermaid';
      chart.style.maxWidth = '100%';
      chart.style.overflowX = 'auto';
      chart.innerHTML = out.svg;
      block.replaceWith(chart);
    } catch (error) {
      say(block, 'This chart could not be drawn: ' +
        String(error && error.message ? error.message : error).split('\n')[0]);
    }
  }

  function draw() {
    var blocks = document.querySelectorAll('pre.mermaid');
    if (!blocks.length) {
      return;
    }
    if (!window.mermaid) {
      // the other script did not arrive: say so once per chart, rather
      // than leave text that looks like a mistake
      for (var j = 0; j < blocks.length; j++) {
        if (blocks[j].textContent.trim()) {
          say(blocks[j], 'This chart is shown as its text: the script ' +
            'that draws it could not be loaded.');
        }
      }
      return;
    }
    window.mermaid.initialize({
      startOnLoad: false,
      // strict: no scripts, no links that run anything
      securityLevel: 'strict',
      theme: dark(blocks[0]) ? 'dark' : 'default',
      // labels are drawn as text, not as HTML: a tag written in a chart
      // is shown as it was written and makes nothing happen (only <br>
      // breaks a line)
      htmlLabels: false,
      // ... and a label on a line gets a solid patch behind it, so that
      // the line does not run through the words
      themeCSS: '.edgeLabel rect, .edgeLabel .background, .labelBkg ' +
        '{ opacity: 1 !important; fill-opacity: 1 !important; }',
      // a chart that cannot be read leaves no picture of Mermaid's own
      suppressErrorRendering: true,
      // a box takes a sentence before its text is broken: Mermaid's own
      // 200 pixels make tall, narrow boxes of wiki-sized labels
      flowchart: { wrappingWidth: 460 },
      // What a chart may NOT change about itself (with an init line or
      // a front matter): Mermaid's own list, and the two settings above
      // that keep its text from becoming markup.
      secure: ['secure', 'securityLevel', 'startOnLoad', 'maxTextSize',
               'suppressErrorRendering', 'maxEdges', 'htmlLabels',
               'themeCSS']
    });

    // one at a time: Mermaid draws one chart at a time
    var line = Promise.resolve();
    function queue(block, number) {
      line = line.then(function () {
        return block.isConnected ? drawOne(block, number) : null;
      });
    }
    var later = null;
    for (var i = 0; i < blocks.length; i++) {
      var block = blocks[i];
      block.dataset.tracmermaid = String(i);
      if (!block.textContent.trim()) {
        // nothing written: nothing to draw, and nothing to complain of
        block.style.display = 'none';
        continue;
      }
      if (shown(block)) {
        queue(block, i);
        continue;
      }
      // Inside something folded away. Mermaid measures the text on the
      // screen, and what is not shown measures as nothing: draw it when
      // it comes into view.
      if (!('IntersectionObserver' in window)) {
        continue;
      }
      if (!later) {
        later = new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              later.unobserve(entry.target);
              queue(entry.target, Number(entry.target.dataset.tracmermaid));
            }
          });
        });
      }
      later.observe(block);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', draw);
  } else {
    draw();
  }
})();
