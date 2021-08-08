import React, { useState, useEffect } from 'react'
import './App.css'
import { withAuthenticator, AmplifySignOut } from '@aws-amplify/ui-react'
import { API, Storage, graphqlOperation } from 'aws-amplify'
import { GraphQLResult } from '@aws-amplify/api'
import * as queries from './graphql/queries'
import * as mutations from './graphql/mutations'
import {
  Note,
  ListNotesQuery,
  CreateNoteMutationVariables,
  CreateNoteMutation,
  DeleteNoteMutationVariables,
} from './API'

const excludeNullsFromArray = (arr: Array<any>): Array<any> => {
  return arr.filter((item): item is NonNullable<typeof item> => item != null)
}

const App = () => {
  const initialFormState = { name: '', description: '', image: '' }
  const [notes, setNotes] = useState<Note[]>([])
  const [formData, setFormData] = useState(initialFormState)

  useEffect(() => {
    fetchNotes()
  }, [])

  const fetchNotes = async () => {
    const responce = (await API.graphql(
      graphqlOperation(queries.listNotes)
    )) as GraphQLResult<ListNotesQuery>
    const notesFromAPI = responce.data?.listNotes?.items
    if (!notesFromAPI) return
    const notes = await Promise.all(
      excludeNullsFromArray(notesFromAPI).map(async (note) => {
        if (note.image) {
          const image = await Storage.get(note.image)
          note.image = image
        }
        return note
      })
    )
    setNotes(notes)
  }

  const createNote = async () => {
    if (!formData.name || !formData.description) return
    const responce = (await API.graphql(
      graphqlOperation(mutations.createNote, {
        input: formData,
      } as CreateNoteMutationVariables)
    )) as GraphQLResult<CreateNoteMutation>
    const noteFromAPI = responce.data?.createNote
    if (!noteFromAPI) return
    if (formData.image) {
      const image = await Storage.get(formData.image)
      if (typeof image === 'object') return //NOTE: Objectの場合未考慮
      formData.image = image
    }
    setNotes([...notes, noteFromAPI])
    setFormData(initialFormState)
  }

  const deleteNote = async (note: Note) => {
    const id = note.id
    const newNotesArray = notes.filter((note) => note.id !== id)
    setNotes(newNotesArray)
    await API.graphql(
      graphqlOperation(mutations.deleteNote, {
        input: { id },
      } as DeleteNoteMutationVariables)
    )
  }

  const onChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files === null || !e.target.files[0]) return
    const file = e.target.files[0]
    setFormData({ ...formData, image: file.name })
    await Storage.put(file.name, file)
    fetchNotes()
  }

  return (
    <div className="App">
      <header>
        <h1>My Notes App</h1>
        <input
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Note name"
          value={formData.name}
        />
        <input
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
          placeholder="Note description"
          value={formData.description}
        />
        <input type="file" onChange={onChange} />
        <button onClick={createNote}>Create Note</button>
        <div style={{ marginBottom: 30 }}>
          {notes.map((note) => (
            <div key={note.id || note.name}>
              <h2>{note.name}</h2>
              <p>{note.description}</p>
              <button onClick={() => deleteNote(note)}>Delete note</button>
              {note.image && (
                <img src={note.image} alt="note" style={{ width: 400 }} />
              )}
            </div>
          ))}
        </div>
      </header>
      <AmplifySignOut />
    </div>
  )
}

export default withAuthenticator(App)
