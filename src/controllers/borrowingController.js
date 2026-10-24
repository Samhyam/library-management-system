module.exports = (service) => ({
  list:          (req, res) => res.status(200).json(service.list(req.query)),
  get:           (req, res) => res.status(200).json(service.get(req.id)),
  issue:         (req, res) => res.status(201).json(service.issue(req.body)),
  returnBook:    (req, res) => res.status(200).json(service.returnBook(req.id)),
  extendDueDate: (req, res) => res.status(200).json(service.extendDueDate(req.id, req.body)),
});
