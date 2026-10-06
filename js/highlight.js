/* Resaltado de sintaxis sin dependencias: C, Assembly ARM, Device Tree y shell.
   Uso: <pre><code class="language-c">...</code></pre> */
(function () {
  'use strict';

  var C_KEYWORDS = new Set(('if else for while do switch case default break continue return goto sizeof typedef ' +
    'struct union enum static const volatile extern inline register void unsigned signed ' +
    '__attribute__ __asm__ asm __iomem __user __init __exit __KERNEL__').split(' '));
  var C_TYPES = new Set(('int char short long float double bool size_t ssize_t off_t loff_t pid_t dev_t ' +
    'uint8_t uint16_t uint32_t uint64_t int8_t int16_t int32_t int64_t u8 u16 u32 u64 ' +
    '__u64 atomic_uint atomic_int atomic_t irqreturn_t ').split(' '));
  var ASM_MNEMONICS = new Set(('ldr str ldm stm ldmfd stmfd ldmia stmia push pop mov movs mvn add adds sub subs rsb ' +
    'and orr eor bic cmp cmn tst teq mul mla b bl bx blx beq bne bgt blt bge ble bhi blo bcs bcc bmi bpl ' +
    'msr mrs mcr mrc cps svc swi wfi wfe nop rfe rfefd srs isb dsb dmb ' +
    'lsl lsr asr ror ldrb strb ldrh strh vld1 vst1 vadd').split(' '));
  var ASM_REGS = /^(?:r(?:1[0-5]|[0-9])|sp|lr|pc|fp|ip|cpsr(?:_\w+)?|spsr(?:_\w+)?|p15|c(?:1[0-5]|[0-9]))$/i;

  function esc(t) {
    return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function span(cls, t) {
    return '<span class="tk-' + cls + '">' + esc(t) + '</span>';
  }

  function isLineStart(src, idx) {
    var ls = src.lastIndexOf('\n', idx - 1) + 1;
    var before = src.slice(ls, idx);
    return /^[ \t]*(?:[\w.$]+:[ \t]*)?$/.test(before);
  }

  function highlightC(src, asm) {
    var re = new RegExp(
      '(\\/\\*[\\s\\S]*?\\*\\/)' +                  // 1 comentario de bloque
      '|(\\/\\/[^\\n]*' + (asm ? '|@[^\\n]*' : '') + ')' + // 2 comentario de línea
      '|("(?:\\\\.|[^"\\\\\\n])*"|\'(?:\\\\.|[^\'\\\\\\n])\')' + // 3 strings/chars
      '|(^[ \\t]*#[ \\t]*[a-z]+)' +                  // 4 directiva de preprocesador
      '|(' + (asm ? '\\.[A-Za-z_]\\w*' : '(?!)') + ')' + // 5 directiva asm (.equ, .word)
      '|(#?-?\\b0[xX][0-9a-fA-F]+[uUlL]*\\b|#?\\b\\d+(?:\\.\\d+)?[uUlL]*\\b)' + // 6 números
      '|([A-Za-z_$][\\w$]*)',                        // 7 identificadores
      'gm');
    var out = '', last = 0, m, prevWord = '';
    while ((m = re.exec(src)) !== null) {
      out += esc(src.slice(last, m.index));
      last = re.lastIndex;
      var t = m[0];
      if (m[1] || m[2]) { out += span('com', t); }
      else if (m[3]) { out += span('str', t); }
      else if (m[4]) { out += span('pre', t); }
      else if (m[5]) {
        if (asm) out += span('pre', t); else out += esc(t);
      }
      else if (m[6]) { out += span('num', t); }
      else if (m[7]) {
        var w = t, next = src.charAt(re.lastIndex);
        var cls = null;
        if (asm && isLineStart(src, m.index) && next === ':') cls = 'fn';                // etiqueta
        else if (asm && isLineStart(src, m.index) && ASM_MNEMONICS.has(w.toLowerCase())) cls = 'kw';
        else if (asm && ASM_REGS.test(w)) cls = 'reg';
        else if (C_KEYWORDS.has(w)) cls = 'kw';
        else if (C_TYPES.has(w) || /_t$/.test(w)) cls = 'type';
        else if (prevWord === 'struct' || prevWord === 'enum' || prevWord === 'union') cls = 'type';
        else if (/^[A-Z][A-Z0-9_]+$/.test(w) || /^_[A-Z0-9_]{2,}_{0,2}$/.test(w)) cls = 'macro';
        else if (/^__\w+__$/.test(w)) cls = 'macro';
        else {
          var k = re.lastIndex;
          while (src.charAt(k) === ' ') k++;
          if (src.charAt(k) === '(') cls = 'fn';
          else if (asm && !isLineStart(src, m.index)) cls = 'fn';   // operando que apunta a una etiqueta
        }
        out += cls ? span(cls, t) : esc(t);
        prevWord = w;
        continue;
      }
      prevWord = '';
    }
    out += esc(src.slice(last));
    return out;
  }

  function highlightDts(src) {
    var re = /(\/\*[\s\S]*?\*\/)|("(?:\\.|[^"\\\n])*")|(\/[\w-]+\/)|(<[^>\n]*>)|([\w,#.+-]+(?=\s*=))|([\w@,.-]+(?=\s*\{))|(&\w+)/g;
    var out = '', last = 0, m;
    while ((m = re.exec(src)) !== null) {
      out += esc(src.slice(last, m.index));
      last = re.lastIndex;
      var t = m[0];
      if (m[1]) out += span('com', t);
      else if (m[2]) out += span('str', t);
      else if (m[3]) out += span('pre', t);
      else if (m[4]) out += span('num', t);
      else if (m[5]) out += span('reg', t);
      else if (m[6]) out += span('type', t);
      else out += span('macro', t);
    }
    return out + esc(src.slice(last));
  }

  function highlightShell(src) {
    return src.split('\n').map(function (line) {
      var m = /^(\s*)([\w./-]+)([^#]*)(#.*)?$/.exec(line);
      if (!m) return esc(line);
      var rest = esc(m[3]).replace(/(\s)(-{1,2}[\w-]+)/g, '$1<span class="tk-macro">$2</span>')
                          .replace(/(\$\([^)]*\))/g, '<span class="tk-str">$1</span>');
      return esc(m[1]) + '<span class="tk-fn">' + esc(m[2]) + '</span>' + rest +
             (m[4] ? '<span class="tk-com">' + esc(m[4]) + '</span>' : '');
    }).join('\n');
  }

  function run() {
    var blocks = document.querySelectorAll('pre > code[class*="language-"]');
    Array.prototype.forEach.call(blocks, function (el) {
      var lang = (/language-(\w+)/.exec(el.className) || [])[1];
      var src = el.textContent;
      var html;
      if (lang === 'c') html = highlightC(src, false);
      else if (lang === 'asm') html = highlightC(src, true);
      else if (lang === 'dts') html = highlightDts(src);
      else if (lang === 'sh') html = highlightShell(src);
      else return;
      el.innerHTML = html;
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
})();
