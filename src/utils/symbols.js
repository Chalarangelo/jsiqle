export const symbolize = str => Symbol.for(str);

export const desymbolize = sym => sym.toString().slice(7, -1);

export const symbolizeKeys = obj => {
  const newObj = {};
  Object.keys(obj).forEach(key => {
    newObj[symbolize(key)] = obj[key];
  });
  return newObj;
};

export const desymbolizeKeys = obj => {
  const newObj = {};
  Object.keys(obj).forEach(key => {
    newObj[desymbolize(key)] = obj[key];
  });
  return newObj;
};
