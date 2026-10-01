const HttpError = require('./HttpError');

const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;
const isPositiveInt = (value) => Number.isInteger(value) && value > 0;
const isNonNegativeInt = (value) => Number.isInteger(value) && value >= 0;

function validateCategory(body, { partial = false } = {}) {
  const data = {};
  const errors = [];

  if (body.name !== undefined) {
    if (!isNonEmptyString(body.name)) errors.push('name must be a non-empty string');
    else data.name = body.name.trim();
  } else if (!partial) {
    errors.push('name is required');
  }

  if (body.description !== undefined) {
    if (body.description !== null && typeof body.description !== 'string') {
      errors.push('description must be a string or null');
    } else {
      data.description = body.description;
    }
  }

  if (errors.length) throw new HttpError(400, errors.join('; '));
  return data;
}

function validateProduct(body, { partial = false } = {}) {
  const data = {};
  const errors = [];

  if (body.sku !== undefined) {
    if (!isNonEmptyString(body.sku)) errors.push('sku must be a non-empty string');
    else data.sku = body.sku.trim();
  } else if (!partial) {
    errors.push('sku is required');
  }

  if (body.name !== undefined) {
    if (!isNonEmptyString(body.name)) errors.push('name must be a non-empty string');
    else data.name = body.name.trim();
  } else if (!partial) {
    errors.push('name is required');
  }

  if (body.price !== undefined) {
    if (!isPositiveInt(body.price)) errors.push('price must be a positive integer');
    else data.price = body.price;
  } else if (!partial) {
    errors.push('price is required');
  }

  if (body.stock !== undefined) {
    if (!isNonNegativeInt(body.stock)) errors.push('stock must be a non-negative integer');
    else data.stock = body.stock;
  }

  if (body.categoryId !== undefined) {
    if (!isPositiveInt(body.categoryId)) errors.push('categoryId must be a positive integer');
    else data.categoryId = body.categoryId;
  } else if (!partial) {
    errors.push('categoryId is required');
  }

  if (errors.length) throw new HttpError(400, errors.join('; '));
  return data;
}

module.exports = { validateCategory, validateProduct };
