var express = require('express'),
    Promise = require('bluebird'),
    mongodb = Promise.promisifyAll( require('mongodb') ),
    ObjectID = mongodb.ObjectID,
    MongoClient = mongodb.MongoClient;

var app = express();
var ingredients, recipes, mongo;

MongoClient.connectAsync( process.env.MONGO_DATABASE_URI + '/recipes' )
  .then(function( db ){
    recipes = db.collection('recipes');
    ingredients = db.collection('ingredients');
  });

app.get('/api/ingredient', function(req, res){
  var keys = req.query.keys;
  if( keys ){
    keys = keys.split(',');
    ingredients.find({
      permutation: {
        $in: keys
      }
    })
    .toArrayAsync()
    .error( res.sendStatus.bind( 500 ) )
    .bind(res)
    .then(res.send);
  } else {
    res.sendStatus(400);
  }
});


app.get('/api/ingredient/query', function(req, res){
  var q = req.query.q;
  if( q ){
    ingredients.find({
      permutation: new RegExp('^' + q )
    })
    .toArrayAsync()
    .error( res.sendStatus.bind( 500 ) )
    .bind(res)
    .then(res.send);
  } else {
    res.sendStatus(400);
  }
});

app.get('/api/recipe/:recipeId', function(req,res){
  var id = req.params.recipeId;
  if( ObjectID.isValid( id ) ){
    recipes.findOneAsync({ _id: ObjectID( id ) })
      .bind( res )
      .then( res.send )
      .error( res.sendStatus.bind( 500 ) );
  } else {
    res.sendStatus(400);
  }
});

app.get('/api/recipe', function(req,res){
  var keys = req.query.keys,
      limit = req.query.limit || 5,
      skip = req.query.skip || 0;

  if( keys ){
    var ingredients = keys.trim().split(',');
    recipes.aggregateAsync([
      {$match: {ingredients: {$in: ingredients }}},
      {$project: {
        _id: 1,
        name: 1,
        image: 1,
        ingredients: 1,
        ingredientsCount: 1,
        ingredient: '$ingredients'
      }},
      {$unwind: "$ingredient"},
      {$match: {"ingredient": {$in: ingredients}}},
      {$group: {
        "_id": "$_id",
        "total": {"$sum": 1},
        "ingredientsCount": {"$first": '$ingredientsCount'},
        "name": {"$first": '$name'},
        "image": {"$first": '$image'},
        "ingredients": {"$first": '$ingredients'}
      }},
      {$sort: { total: -1,ingredientsCount: 1 } },
      {$limit: 15},
    ])
    .then(function(objs){
      res.send(objs);
    });

  } else {
    res.sendStatus(400);
  }
})

app.listen( process.env.PORT || 8080 );
