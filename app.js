const express = require("express");
const path = require("path");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");
const format = require("date-fns/format");
const isMatch = require("date-fns/isMatch");
const app = express();
app.use(express.json());
const databasePath = path.join(__dirname, "todoApplication.db");
let database = null;

const initializeAndDbAndServer = async () => {
  try {
    database = await open({ filename: databasePath, driver: sqlite3.Database });
    app.listen(3000, () => {
      console.log(`server is running on http://localhost:3000`);
    });
  } catch (error) {
    console.log(`Database error is ${error}`);
    process.exit(1);
  }
};
initializeAndDbAndServer();

const hasPriorityAndStatus = (requestQuery) => {
  return (
    requestQuery.priority !== undefined && requestQuery.status !== undefined
  );
};

const hasPriority = (requestQuery) => {
  return requestQuery.priority !== undefined;
};

const hasStatus = (requestQuery) => {
  return requestQuery.status !== undefined;
};

const hasCategoryAndStatus = (requestQuery) => {
  return (
    requestQuery.category !== undefined && requestQuery.status !== undefined
  );
};

const hasCategoryAndPriority = (requestQuery) => {
  return (
    requestQuery.category !== undefined && requestQuery.priority !== undefined
  );
};

const hasSearch = (requestQuery) => {
  return requestQuery.search_q !== undefined;
};

const hasCategory = (requestQuery) => {
  return requestQuery.category !== undefined;
};

const outputResult = (dbObject) => {
  return {
    id: dbObject.id,
    todo: dbObject.todo,
    priority: dbObject.priority,
    status: dbObject.status,
    category: dbObject.category,
    dueDate: dbObject.due_date,
  };
};

app.get("/todos/", async (request, response) => {
  let data = null;
  let getTodosQuery = "";
  const { search_q = "", priority, status, category } = request.query;

  switch (true) {
    case hasPriorityAndStatus(request.query):
      getTodosQuery = `select * from todo where priority = '${priority}' && status = '${status}';`;
      break;
    case hasPriority(request.query):
      getTodosQuery = `select * from todo where priority = '${priority}';`;
      break;
    case hasStatus(request.query):
      getTodosQuery = `select * from todo where status = '${status}';`;
      break;
    case hasCategoryAndStatus(request.query):
      getTodosQuery = `select * from todo where category = '${category}' and status = '${status}';`;
      break;
    case hasCategoryAndPriority(request.query):
      getTodosQuery = `select * from todo where category = '${category}' and priority = '${priority}';`;
      break;
    case hasSearch(request.query):
      getTodosQuery = `select * from todo where todo = '%${search_q}%;`;
      break;
    case hasCategory(request.query):
      getTodosQuery = `select * from todo where category = '${category}';`;
      break;
    default:
      getTodosQuery = `select * from todo`;
      break;
  }
  console.log(getTodosQuery);
  const getTodosQueryResponse = await database.all(getTodosQuery);
  //console.log(getTodosQueryResponse);
  response.send(
    getTodosQueryResponse.map((eachItem) => outputResult(eachItem))
  );
});

app.get("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const getTodoQuery = `select * from todo where id = '${todoId}';`;
  const getTodoQueryResponse = await database.get(getTodoQuery);
  response.send(outputResult(getTodoQueryResponse));
});

app.get("/agenda/", async (request, response) => {
  const { date } = request.query;
  if (isMatch(date, "yyyy-MM-dd")) {
    const newDate = format(new Date(date), "yyyy-MM-dd");
    const dateQuery = `select * from todo where due_date = '${newDate}';`;
    const dateQueryResponse = database.all(dateQuery);
    response.send(dateQueryResponse.map((eachItem) => outputResult(eachItem)));
  } else {
    response.status(400);
    response.send("Invalid Due Date");
  }
});

app.post("/todos/", async (request, response) => {
  const { id, todo, priority, status, category, dueDate } = request.body;
  const postTodoQuery = `insert into todo (id,todo, priority, status, category, due_date) values ('${id}', '${todo}', '${priority}', '${status}', '${category}', '${dueDate}');`;
  await database.run(postTodoQuery);
  response.send("Todo Added Successfully");
});

app.put("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  let updateColumn = "";
  const requestBody = request.body;
  console.log(requestBody);
  const previousTodoQuery = `SELECT * FROM todo WHERE id = ${todoId};`;
  const previousTodo = await database.get(previousTodoQuery);
  const {
    todo = previousTodo.todo,
    priority = previousTodo.priority,
    status = previousTodo.status,
    category = previousTodo.category,
    dueDate = previousTodo.dueDate,
  } = request.body;

  let updateTodoQuery;
  switch (true) {
    case requestBody.status !== undefined:
      if (status === "TO DO" || status === "IN PROGRESS" || status === "DONE") {
        updateTodoQuery = `
    UPDATE todo SET todo='${todo}', priority='${priority}', status='${status}', category='${category}',
     due_date='${dueDate}' WHERE id = ${todoId};`;

        await database.run(updateTodoQuery);
        response.send(`Status Updated`);
      } else {
        response.status(400);
        response.send("Invalid Todo Status");
      }
      break;

    case requestBody.priority !== undefined:
      if (priority === "HIGH" || priority === "LOW" || priority === "MEDIUM") {
        updateTodoQuery = `
    UPDATE todo SET todo='${todo}', priority='${priority}', status='${status}', category='${category}',
     due_date='${dueDate}' WHERE id = ${todoId};`;

        await database.run(updateTodoQuery);
        response.send(`Priority Updated`);
      } else {
        response.status(400);
        response.send("Invalid Todo Priority");
      }
      break;

    case requestBody.todo !== undefined:
      updateTodoQuery = `
    UPDATE todo SET todo='${todo}', priority='${priority}', status='${status}', category='${category}',
     due_date='${dueDate}' WHERE id = ${todoId};`;

      await database.run(updateTodoQuery);
      response.send(`Todo Updated`);
      break;

    case requestBody.category !== undefined:
      if (
        category === "WORK" ||
        category === "HOME" ||
        category === "LEARNING"
      ) {
        updateTodoQuery = `
    UPDATE todo SET todo='${todo}', priority='${priority}', status='${status}', category='${category}',
     due_date='${dueDate}' WHERE id = ${todoId};`;

        await database.run(updateTodoQuery);
        response.send(`Category Updated`);
      } else {
        response.status(400);
        response.send("Invalid Todo Category");
      }
      break;
    case requestBody.dueDate !== undefined:
      if (isMatch(dueDate, "yyyy-MM-dd")) {
        const newDueDate = format(new Date(dueDate), "yyyy-MM-dd");
        updateTodoQuery = `
    UPDATE todo SET todo='${todo}', priority='${priority}', status='${status}', category='${category}',
     due_date='${newDueDate}' WHERE id = ${todoId};`;

        await database.run(updateTodoQuery);
        response.send(`Due Date Updated`);
      } else {
        response.status(400);
        response.send("Invalid Due Date");
      }
      break;
  }
});

app.delete("/todos/:todoId", async (request, response) => {
  const { todoId } = request.params;
  const deleteTodoQuery = `delete from todo where id = '${todoId}';`;
  await database.run(deleteTodoQuery);
  response.send("Todo Deleted");
});

module.exports = app;
