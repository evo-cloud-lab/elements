### Schema

An extendable data object validation and normalization module.

First, define a schema:

```javascript
var MySchema = {
    firstName: String,
    lastName: 'string',
    age: 'integer',
    gender: ['male', 'female'],
    home: Schema.nest({
        address: { type: 'string', presence: true, empty: false },
        address2: 'string',
        city: { type: 'string', presence: true, empty: false, fn: validateCityName },
        province: 'string',
        country: { type: 'string', presence: true, empty: false, fn: validateCountry }
    }),
    ...
};
```

Then use the schema to normalize data:

```javascript
var normalized = Schema.accept(MySchema, { ... });
```

When validation fails, unified error (see Errors) is returned.
To throw error instead of returning it, append `throws` to options:

```javascript
var normalized = Schema.accept(MySchema, { ... }, { throws: true });
```

Normally, only attributes defined in schema will be accepted, others are dropped.
To include undefined attributes as well, append `all` to options. E.g. `{ all: true }`.

To extend with your own validator:

```javascript
Schema.validators['identity'] = function (identity, options, value, attrName) {
    if (value.match(identity)) {
        return value;
    }
    return Errors.badAttr(attrName, value);
};
```

And you can use:

```javascript
var MySchema = {
    id: { identity: /^\d+(-\d+)*$/, type: 'string', presence: true }
};
Schema.accept(MySchema, { id: '456-783-123' });
```