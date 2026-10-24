module.exports = (service) => ({
  stats: (req, res) => res.status(200).json(service.stats()),
});
