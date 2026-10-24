// Business-logic layer for members.
const { NotFoundError, ConflictError } = require('../utils/errors');
const { isBlank, isValidEmail, normalisePhone, throwIfErrors } = require('../utils/validators');
const { today, isValidISODate } = require('../utils/dates');

module.exports = ({ memberRepo, borrowingRepo }) => {
  function validate(body = {}) {
    const errors = []; const out = {};
    if (isBlank(body.name)) errors.push({ field: 'name', message: 'Name is required.' });
    else if (String(body.name).trim().length > 100) errors.push({ field: 'name', message: 'Name must be 100 characters or fewer.' });
    else out.name = String(body.name).trim();

    if (isBlank(body.email)) errors.push({ field: 'email', message: 'Email is required.' });
    else if (!isValidEmail(body.email)) errors.push({ field: 'email', message: 'Enter a valid email address, for example name@example.com.' });
    else out.email = String(body.email).trim().toLowerCase();

    if (isBlank(body.phone)) errors.push({ field: 'phone', message: 'Phone is required.' });
    else {
      const phone = normalisePhone(body.phone);
      if (!phone) errors.push({ field: 'phone', message: 'Phone must be exactly 10 digits.' });
      else out.phone = phone;
    }

    if (isBlank(body.membershipDate)) out.membershipDate = today();
    else if (!isValidISODate(body.membershipDate) || body.membershipDate > today())
      errors.push({ field: 'membershipDate', message: 'Membership date must be a valid date (YYYY-MM-DD) that is not in the future.' });
    else out.membershipDate = body.membershipDate;
    throwIfErrors(errors);
    return out;
  }

  function requireMember(id) {
    const m = memberRepo.findById(id);
    if (!m) throw new NotFoundError(`Member with id ${id} was not found.`);
    return m;
  }

  function duplicateEmail(email) {
    return new ConflictError(`A member with email ${email} already exists.`, [{ field: 'email', message: 'This email is already registered.' }]);
  }

  return {
    list(query = {}) { return memberRepo.findAll({ search: query.search ? String(query.search).trim() : undefined }); },
    get(id) { return requireMember(id); },
    create(body) {
      const data = validate(body);
      if (memberRepo.findByEmail(data.email)) throw duplicateEmail(data.email);
      return memberRepo.create(data);
    },
    update(id, body) {
      requireMember(id);
      const data = validate(body);
      const clash = memberRepo.findByEmail(data.email);
      if (clash && clash.id !== id) throw duplicateEmail(data.email);
      return memberRepo.update(id, data);
    },
    remove(id) {
      const m = requireMember(id);
      if (borrowingRepo.countForMember(id) > 0)
        throw new ConflictError(`${m.name} has borrowing records and cannot be deleted.`);
      memberRepo.remove(id);
    },
  };
};
