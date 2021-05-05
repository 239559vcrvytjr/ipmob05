String.prototype.invertCase = function () {
  return this.split("")
    .map((chr) => {
      switch (true) {
        case chr.toUpperCase() === chr:
          return chr.toLowerCase();
        case chr.toLowerCase() === chr:
          return chr.toUpperCase();
        default:
          return chr;
      }
    })
    .join("");
};

onmessage = function (e) {
  const data = { ...e.data };

  for (const [k, v] of Object.entries(data)) {
    try {
      data[k] = v.invertCase();
    } catch {}
  }

  postMessage(data);
};
