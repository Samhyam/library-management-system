// Runs on routes containing :id. Rejects anything that is not a positive whole number.
const { ValidationError } = require('../utils/errors');
const { parseId } = require('../utils/validators');

module.exports = (req, res, next) => {
  const id = parseId(req.params.id);
  if (!id) return next(new ValidationError(`Invalid id "${req.params.id}". An id must be a positive whole number.`));
  req.id = id;
  next();
};
