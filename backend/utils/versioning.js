// Utility to copy all model fields except blacklisted ones for versioning
function copyModelFieldsForVersioning(modelInstance, blacklist = []) {
  // Get all own properties (including virtuals, but we filter those out)
  const data = modelInstance.get ? modelInstance.get({ plain: true }) : { ...modelInstance };
  // Remove blacklisted fields
  for (const key of blacklist) {
    delete data[key];
  }
  return data;
}

module.exports = { copyModelFieldsForVersioning };