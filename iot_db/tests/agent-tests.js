'use strict'

const test = require('ava')
const proxyquire = require('proxyquire')
const sinon = require('sinon')

const agentFixtures = require('./fixtures/agent')

let config = {
    logging: function () {}
}
// representa al modelo
let MetricStub = {
    belongsTo: sinon.spy()
}

let single = Object.assign({}, agentFixtures.single)
let id = 1
let uuid = 'yyy-yyy-yyy'
let AgentStub = null
let db = null
let sandbox = null

let uuidArgs = { where: { uuid } }
let connectedArgs = { where: { connected: true } }
let usernameArgs = { where: { username: 'platzi', connected: true } }
let newAgent = {
    uuid: '123-123-123',
    name: 'test',
    username: 'test',
    hostname: 'test',
    pid: 0,
    connected: false
}

test.beforeEach(async () => {
    sandbox = sinon.createSandbox()
    AgentStub = {
        hasMany: sandbox.spy()
    }

    // Model create Stub
    AgentStub.create = sandbox.stub()
    AgentStub.create.withArgs(newAgent).returns(Promise.resolve({
        toJSON() { return newAgent }
    }))

    // Model update Stub
    AgentStub.update = sandbox.stub()
    AgentStub.update.withArgs(single, uuidArgs).returns(Promise.resolve(single))

    // Model findById Stub
    AgentStub.findById = sandbox.stub()
    AgentStub.findById.withArgs(id).returns(Promise.resolve(agentFixtures.byId(id)))

    // Model findOne Stub
    AgentStub.findOne = sandbox.stub()
    AgentStub.findOne.withArgs(uuidArgs).returns(Promise.resolve(agentFixtures.byUuid(uuid)))

    // Model findAll Stub
    AgentStub.findAll = sandbox.stub()
    AgentStub.findAll.withArgs().returns(Promise.resolve(agentFixtures.all))
    AgentStub.findAll.withArgs(connectedArgs).returns(Promise.resolve(agentFixtures.connected))
    AgentStub.findAll.withArgs(usernameArgs).returns(Promise.resolve(agentFixtures.platzi))

    const setupDatabase = proxyquire('../', {
        './models/agent': () => AgentStub,
        './models/metric': () => MetricStub
    })
    db = await setupDatabase(config)
})

test.afterEach(t => {
    sandbox && sandbox.restore()
})

test('Agent', t => {
    t.truthy(db.Agent, 'Servicio Agent deberia existir!')
})

test.serial('Setup', t => {
    t.true(AgentStub.hasMany.called, 'AgentModel.hasMany fue ejecutado')
    t.true(AgentStub.hasMany.calledWith(MetricStub), 'El Argumento deberia ser MetricModel')
    t.true(MetricStub.belongsTo.called, 'MetricModel.belongsTo fue ejecutado')
    t.true(MetricStub.belongsTo.calledWith(AgentStub), 'El Argumento deberia ser AgentModel')
})

test.serial('Agent#findById', async t => {
    let agent = await db.Agent.findById(id)
    
    t.true(AgentStub.findById.called, 'findById deberia ser llamada en el modelo')
    t.true(AgentStub.findById.calledOnce, 'findById deberia ser llamada una vez')
    t.true(AgentStub.findById.calledWith(id), 'findById deberia ser llamada con especifico id')

    t.deepEqual(agent, agentFixtures.byId(id), 'Deberia ser el mismo')
})

test.serial('Agent#findByUuid', async t => {
    let agent = await db.Agent.findByUuid(uuid)
  
    t.true(AgentStub.findOne.called, 'findOne should be called on model')
    t.true(AgentStub.findOne.calledOnce, 'findOne should be called once')
    t.true(AgentStub.findOne.calledWith(uuidArgs), 'findOne should be called with uuid args')
  
    t.deepEqual(agent, agentFixtures.byUuid(uuid), 'agent should be the same')
})

test.serial('Agent#findAll', async t => {
    let agents = await db.Agent.findAll()
  
    t.true(AgentStub.findAll.called, 'findAll should be called on model')
    t.true(AgentStub.findAll.calledOnce, 'findAll should be called once')
    t.true(AgentStub.findAll.calledWith(), 'findAll should be called without args')
  
    t.is(agents.length, agentFixtures.all.length, 'agents should be the same amount')
    t.deepEqual(agents, agentFixtures.all, 'agents should be the same')
})

test.serial('Agent#findConnected', async t => {
    let agents = await db.Agent.findConnected()
  
    t.true(AgentStub.findAll.called, 'findAll should be called on model')
    t.true(AgentStub.findAll.calledOnce, 'findAll should be called once')
    t.true(AgentStub.findAll.calledWith(connectedArgs), 'findAll should be called with connected args')
  
    t.is(agents.length, agentFixtures.connected.length, 'agents should be the same amount')
    t.deepEqual(agents, agentFixtures.connected, 'agents should be the same')
})

test.serial('Agent#findByUsername', async t => {
    let agents = await db.Agent.findByUsername('platzi')
  
    t.true(AgentStub.findAll.called, 'findAll should be called on model')
    t.true(AgentStub.findAll.calledOnce, 'findAll should be called once')
    t.true(AgentStub.findAll.calledWith(usernameArgs), 'findAll should be called with username args')
  
    t.is(agents.length, agentFixtures.platzi.length, 'agents should be the same amount')
    t.deepEqual(agents, agentFixtures.platzi, 'agents should be the same')
})

test.serial('Agent#createOrUpdate - exists', async t => {
    let agent = await db.Agent.createOrUpdate(single)

    t.true(AgentStub.findOne.called, 'findOne should be called on model')
    t.true(AgentStub.findOne.calledTwice, 'findOne should be called twice')
    t.true(AgentStub.findOne.calledWith(uuidArgs), 'findOne should be called with uuid args')
    t.true(AgentStub.update.called, 'agent.update called on model')
    t.true(AgentStub.update.calledOnce, 'agent.update should be called once')
    t.true(AgentStub.update.calledWith(single), 'agent.update should be called with specified args')

    t.deepEqual(agent, single, 'Agent deberia ser el mismo')
})

test.serial('Agent#createOrUpdate - new', async t => {
    let agent = await db.Agent.createOrUpdate(newAgent)
  
    t.true(AgentStub.findOne.called, 'findOne should be called on model')
    t.true(AgentStub.findOne.calledOnce, 'findOne should be called once')
    t.true(AgentStub.findOne.calledWith({
      where: { uuid: newAgent.uuid }
    }), 'findOne should be called with uuid args')
    t.true(AgentStub.create.called, 'create should be called on model')
    t.true(AgentStub.create.calledOnce, 'create should be called once')
    t.true(AgentStub.create.calledWith(newAgent), 'create should be called with specified args')
  
    t.deepEqual(agent, newAgent, 'agent should be the same')
  })
