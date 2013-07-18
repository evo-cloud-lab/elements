### Unified Error Representation

A unified error is defined as:

- it must be an instance of `Error`;
- it must contain a property `code` of short string value as error type, e.g. `BADATTR`;
- it may contain extra properties.

Use `Errors.make(code, properties)` to create a unified error. `code` is mandatory, and `properties` is optional.

Any instance of Error can be unified using `Errors.wrap(err, code, properties)`.