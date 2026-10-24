// Controller layer: reads the HTTP request, calls the service, sends the HTTP response.
module.exports = (service) => ({
  list:       (req, res) => res.status(200).json(service.list(req.query)),
  categories: (req, res) => res.status(200).json(service.categories()),
  get:        (req, res) => res.status(200).json(service.get(req.id)),
  create:     (req, res) => res.status(201).json(service.create(req.body)),
  update:     (req, res) => res.status(200).json(service.update(req.id, req.body)),
  remove:     (req, res) => { service.remove(req.id); res.status(204).end(); },
});
