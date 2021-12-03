import { Schema } from 'src/schema';
import { Validator } from 'src/validator';

// This is the public API, be extra careful not to add anything internal here.
const jedql = {
  Schema,
  Validator,
};

export default jedql;
