'use strict';

const User = require('../models/User');

// Names are joined onto almost every response. The team is small and rarely
// changes, so one cached lookup replaces a database round trip per request.
const TTL_MS = 60_000;
let cache = null;

async function getUserNames() {
  if (cache && cache.expires > Date.now()) return cache.names;
  const users = await User.find({}, '_id name').lean();
  const names = new Map(users.map((u) => [String(u._id), u.name]));
  cache = { names, expires: Date.now() + TTL_MS };
  return names;
}

/** Returns { id, name } for a user id, with an empty name if unknown. */
function personRef(names, id) {
  return { id, name: names.get(String(id)) || '' };
}

module.exports = { getUserNames, personRef };
