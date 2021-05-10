const LOWERCASE_CHARS = "aąbcćdeęfghijklłmnńoóprsśtuwyzżź";
const UPPERCASE_CHARS = LOWERCASE_CHARS.toUpperCase();

function getLetterSum(str) {
  return str
    .split("")
    .map((chr) => {
      if (LOWERCASE_CHARS.includes(chr)) return 1 + LOWERCASE_CHARS.indexOf(chr);
      if (UPPERCASE_CHARS.includes(chr)) return 1 + 30 + UPPERCASE_CHARS.indexOf(chr);
      return 0;
    })
    .reduce((total, value) => total + value, 0);
}

onmessage = function (e) {
  const data = { ...e.data };

  const sum = Object.values(data)
    .map((v) => {
      try {
        return getLetterSum(v);
      } catch {
        return 0;
      }
    })
    .reduce((total, value) => total + value, 0);

  const r = sum % 255;
  const g = 255 - r;
  const b = 0.5 * r > 125 ? 99 : 199;

  postMessage({ r, g, b });
};
