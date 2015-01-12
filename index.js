var express = require('express'),
    Promise = require('bluebird'),
    mongodb = Promise.promisifyAll( require('mongodb') ),
    ObjectID = mongodb.ObjectID,
    MongoClient = mongodb.MongoClient;

var app = express();
var mongo;
MongoClient.connectAsync( process.env.MONGO_DATABASE_URI )
  .then(function( db ){
    mongo = db;
    console.log('connected to database');
  }).error(function(e){
    console.error(e);
  })

app.get('/ingredient', function(req, res){
  var keys = req.query.keys;
  if( keys ){
    keys = keys.split(',');
    mongo.collection('ingredients').find({
      permutation: {
        $in: keys
      }
    })
    .toArrayAsync()
    .bind(res)
    .error( res.sendStatus.bind( 500 ) )
    .then(res.send);
  } else {
    res.sendStatus(400);
  }
});

app.get('/ingredient/query', function(req, res){
  var q = req.query.q;
  if( q ){
    mongo.collection('ingredients').find({
      permutation: new RegExp('^' + q )
    })
    .toArrayAsync()
    .bind( res )
    .then( res.send )
    .error( res.sendStatus.bind( res, 500 ) );
  } else {
    res.sendStatus(400);
  }
});


app.get('/ingredient/:ingredient', function(req, res){
  var ingredientName = req.params.ingredient;
  if( ingredientName ){
    mongo.collection('ingredients').findOneAsync({
      permutation: ingredientName
    })
    .bind(res)
    .error( res.sendStatus.bind( res, 500 ) )
    .then( res.send );
  } else {
    res.sendStatus(400);
  }
});


app.get('/recipe/:recipeId', function(req,res){
  var id = req.params.recipeId;
  if( ObjectID.isValid( id ) ){
    mongo.collection('recipes').findOneAsync({ _id: ObjectID( id ) })
      .bind( res )
      .then( res.send )
      .error( res.sendStatus.bind( res, 500 ) );
  } else {
    res.sendStatus(400);
  }
});

app.get('/recipe', function(req,res){
  var keys = req.query.keys,
      limit = req.query.limit || 12,
      skip = req.query.skip || 0;

  if( keys ){
    var ingredients = keys.trim().split(',');
    mongo.collection('recipes').aggregateAsync([
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
      {$limit: limit},
    ])
    .bind(res)
    .error( res.sendStatus.bind( res, 500 ) )
    .then( res.send );

  } else {
    res.sendStatus(400);
  }
})

app.listen( process.env.PORT || 8080 );
