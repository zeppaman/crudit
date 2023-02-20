import chai, { expect } from 'chai';
import dotenv from  'dotenv';
import {crudy,database}  from "../../src/index.mjs";

console.log(process.env.CRUDIT_DBURL)

crudy.config(function(config){
    config.settings.database.name='test';
    config.settings.database.roles=['owner']; 
    config.settings.database.url=process.env.CRUDIT_DBURL;
  });
// collection+db scoped
crudy.configEntity('validateBoth', {
    db: 'testValidationDb',
    collection: 'testCollection',
    validation: {
        age: 'min:18|required',
        email: 'email|required'
    }
});

// collection scoped 
crudy.configEntity('validateCollection', {
    collection: 'testCollection',
    validation: {
        'age': 'required|min:18',
        'email': 'required|email'
    }
});

//database scoped
crudy.configEntity('validateDb', {
    db: 'testValidationDb',
    validation: {
        age: 'min:18|required',
        email: 'email|required'
    }
});


describe('validate_db', async function () {
    it('validate db only', async function () {
        let response= await database.insert('testValidationDb', 'collection', {age: 19, email: 'email@fake.com'});
        expect(response.hasErrors).to.be.false
        expect(await database.insert('testValidationDb', 'collection', {age: 17, email: 'not_email'})).throws;
    });
});

describe('validate_collection', async function () {
    it('validate collection only', async function () {        
        let response= await database.insert('database', 'testCollection', {age: 19, email: 'email@fake.com'});
        expect(response.hasErrors).to.be.false
        expect(await database.insert('database', 'testCollection', {age: 17, email: 'not_email'})).throws;
    });
});

describe('validate_both', async function () {
    it('validate both collection and db', async function () {        
        let response= await database.insert('database', 'testCollection', {age: 19, email: 'email@fake.com'});
        expect(response.hasErrors).to.be.false
        expect(await database.insert('database', 'testCollection', {age: 17, email: 'not_email'})).throws;
    
        expect(result.valid._id).to.not.be.null;
        expect(result.not_pertinent_db._id).to.not.be.null;
        expect(result.not_pertinent_collection._id).to.not.be.null;
        expect(result.not_pertinent_both._id).to.not.be.null;
        expect(result.invalid.errors).to.not.be.null;
    });
});