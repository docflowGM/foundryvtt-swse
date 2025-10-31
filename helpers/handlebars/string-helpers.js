export const stringHelpers = {
  upper: (str) => String(str || "").toUpperCase(),
  lower: (str) => String(str || "").toLowerCase(),
  capitalize: (str) => {
    const s = String(str || "");
    return s.charAt(0).toUpperCase() + s.slice(1);
  },
  titleCase: (str) => String(str || "").replace(/\w\S*/g, 
    (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  )
};
