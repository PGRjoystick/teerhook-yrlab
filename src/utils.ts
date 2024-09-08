const startsWithIgnoreCase = (str, prefix) => str.toLowerCase().startsWith(prefix.toLowerCase());

const startsWithCase = (str, prefix) => str.toLowerCase().startsWith(prefix);

export { startsWithIgnoreCase, startsWithCase };
